import { HandoverRecord, SpreadsheetInfo } from '../types/receipt';

const DEFAULT_SHEET_TITLE = 'Riwayat Serah Terima Ekspedisi (Label & Plastik)';
const DEFAULT_TAB_NAME = 'Serah Terima Logistik';

const HEADERS = [
  'No. Tanda Terima / BAST',
  'Tanggal & Jam',
  'Ekspedisi',
  'Kurir / Driver',
  'Kontak Kurir',
  'Plat Kendaraan',
  'No. Surat Jalan / DO',
  'Penerima / PIC Gudang',
  'Gudang / Cabang',
  'Total Qty',
  'Rincian Barang (Label, Plastik, dll)',
  'Status Penerimaan',
  'Catatan / Keterangan',
  'Waktu Tercatat',
];

/**
 * Searches user's Google Drive for existing logistics spreadsheet or creates a new one.
 */
export async function findOrCreateReceiptsSpreadsheet(
  accessToken: string
): Promise<SpreadsheetInfo> {
  // 1. Try to find existing spreadsheet in Drive
  try {
    const query = encodeURIComponent(
      `name='${DEFAULT_SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (driveRes.ok) {
      const driveData = await driveRes.json();
      if (driveData.files && driveData.files.length > 0) {
        const file = driveData.files[0];
        return {
          id: file.id,
          title: file.name,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          sheetName: DEFAULT_TAB_NAME,
        };
      }
    }
  } catch (err) {
    console.warn('Could not query Drive files, creating new spreadsheet:', err);
  }

  // 2. Create a new Google Spreadsheet with stylized header
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: DEFAULT_SHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: DEFAULT_TAB_NAME,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.09, green: 0.38, blue: 0.31 }, // Deep emerald
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${errorBody}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Format header row freeze
  try {
    const sheetId = createdData.sheets?.[0]?.properties?.sheetId || 0;
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      }),
    });
  } catch (fmtErr) {
    console.warn('Optional format step skipped:', fmtErr);
  }

  return {
    id: spreadsheetId,
    title: DEFAULT_SHEET_TITLE,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName: DEFAULT_TAB_NAME,
  };
}

/**
 * Appends a logistics handover record into Google Sheets
 */
export async function appendReceiptToSheet(
  accessToken: string,
  spreadsheetId: string,
  record: HandoverRecord,
  sheetName: string = DEFAULT_TAB_NAME
): Promise<boolean> {
  const expeditionName =
    record.expedition === 'Lainnya' && record.expeditionCustomName
      ? record.expeditionCustomName
      : record.expedition;

  // Format items summary: "Label Thermal (100x150 mm): 10 Rol; Plastik Polymailer (25x35 cm): 20 Pack"
  const itemsSummary = (record.items || [])
    .map((item) => {
      const spec = item.sizeOrSpec ? ` (${item.sizeOrSpec})` : '';
      return `${item.name}${spec}: ${item.quantity} ${item.unit} [${item.condition}]`;
    })
    .join(' | ');

  const rowData = [
    record.handoverNumber,
    record.date + (record.time ? ` ${record.time}` : ''),
    expeditionName,
    record.courierName,
    record.courierPhone || '-',
    record.vehiclePlate || '-',
    record.referenceNumber || '-',
    record.receiverName,
    record.warehouseName || '-',
    record.totalQuantity,
    itemsSummary || '-',
    record.status,
    record.notes || '-',
    new Date().toLocaleString('id-ID'),
  ];

  const range = `${encodeURIComponent(sheetName)}!A:N`;
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A:N`,
        majorDimension: 'ROWS',
        values: [rowData],
      }),
    }
  );

  if (!appendRes.ok) {
    const errorText = await appendRes.text();
    throw new Error(`Gagal menyimpan baris tanda terima ke Google Sheets: ${errorText}`);
  }

  return true;
}

/**
 * Fetches existing handover records from Google Sheets
 */
export async function fetchReceiptsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = DEFAULT_TAB_NAME
): Promise<HandoverRecord[]> {
  const range = `${encodeURIComponent(sheetName)}!A2:N2000`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Spreadsheet tidak ditemukan di Google Drive.');
    }
    const errText = await res.text();
    throw new Error(`Gagal membaca data dari Google Sheets: ${errText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .map((row, index) => {
      if (!row || row.length === 0 || !row[0]) return null;

      const totalQty = parseInt(String(row[9] || '0').replace(/[^0-9]/g, ''), 10) || 0;

      // Parse items summary back to items structure
      const rawSummary = String(row[10] || '');
      const parsedItems = rawSummary
        .split(' | ')
        .filter(Boolean)
        .map((str, itIdx) => {
          return {
            id: `item-${index}-${itIdx}`,
            category: 'Lainnya' as any,
            name: str.split(':')[0]?.trim() || str,
            quantity: 1,
            unit: 'Pcs' as any,
            condition: 'Lengkap & Baik' as any,
          };
        });

      const record: HandoverRecord = {
        id: `sheet-${index}-${row[0]}`,
        handoverNumber: String(row[0] || ''),
        date: String(row[1] || '').split(' ')[0] || new Date().toISOString().split('T')[0],
        time: String(row[1] || '').split(' ')[1] || '',
        expedition: (row[2] as any) || 'J&T Express',
        courierName: String(row[3] || ''),
        courierPhone: String(row[4] || ''),
        vehiclePlate: String(row[5] || ''),
        referenceNumber: String(row[6] || ''),
        receiverName: String(row[7] || ''),
        warehouseName: String(row[8] || ''),
        totalQuantity: totalQty,
        items: parsedItems.length > 0 ? parsedItems : [],
        status: (row[11] as any) || 'Diterima Lengkap',
        notes: String(row[12] || ''),
        createdAt: String(row[13] || new Date().toISOString()),
        syncedToSheets: true,
        sheetsRowIndex: index + 2,
      };

      return record;
    })
    .filter((item): item is HandoverRecord => item !== null)
    .reverse(); // Newest first
}

/**
 * Delete a handover row from Google Sheets.
 */
export async function deleteReceiptRowFromSheet(
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number,
  sheetId: number = 0
): Promise<boolean> {
  const zeroIndexedRow = rowIndex - 1;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: zeroIndexedRow,
              endIndex: zeroIndexedRow + 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal menghapus baris dari Google Sheets: ${errorText}`);
  }

  return true;
}
