import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element directly to a downloadable PDF file.
 * Handles high-DPI scaling and clean page formatting.
 */
export async function exportElementToPdf(
  elementId: string,
  filename: string = 'Tanda_Terima_Ekspedisi.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemen dokumen tidak ditemukan.');
  }

  // Temporary styling adjustments to ensure flawless capture
  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (300 DPI equivalent)
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    // Check if fits single page or needs scaling
    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
    } else {
      // Scale to fit neatly on one A4 page if slight overflow, or split
      const scaleFactor = (pageHeight - margin * 2) / contentHeight;
      const fitWidth = contentWidth * Math.min(scaleFactor, 1);
      const xOffset = margin + (contentWidth - fitWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, fitWidth, pageHeight - margin * 2);
    }

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } finally {
    element.style.backgroundColor = originalBackground;
  }
}

/**
 * Triggers a clean print dialog without background page clutter.
 * Uses an isolated hidden iframe that works reliably inside iframes.
 */
export function printElementSafely(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Create isolated printing iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Copy CSS styles into iframe
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((s) => s.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <base href="${window.location.href}">
        <title>Tanda Terima Ekspedisi</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-receipt {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%;">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 400);
}
