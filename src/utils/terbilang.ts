/**
 * Utility to convert numbers to Indonesian words (Terbilang).
 * E.g., 1500000 -> "Satu Juta Lima Ratus Ribu Rupiah"
 */

const satuan = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

function angkaKeKata(n: number): string {
  if (n < 12) {
    return satuan[n];
  } else if (n < 20) {
    return `${angkaKeKata(n - 10)} Belas`;
  } else if (n < 100) {
    const sisa = n % 10;
    return `${angkaKeKata(Math.floor(n / 10))} Puluh${sisa ? ` ${satuan[sisa]}` : ''}`;
  } else if (n < 200) {
    const sisa = n - 100;
    return `Seratus${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 1000) {
    const sisa = n % 100;
    return `${angkaKeKata(Math.floor(n / 100))} Ratus${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 2000) {
    const sisa = n - 1000;
    return `Seribu${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 1000000) {
    const sisa = n % 1000;
    return `${angkaKeKata(Math.floor(n / 1000))} Ribu${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 1000000000) {
    const sisa = n % 1000000;
    return `${angkaKeKata(Math.floor(n / 1000000))} Juta${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 1000000000000) {
    const sisa = n % 1000000000;
    return `${angkaKeKata(Math.floor(n / 1000000000))} Miliar${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  } else if (n < 1000000000000000) {
    const sisa = n % 1000000000000;
    return `${angkaKeKata(Math.floor(n / 1000000000000))} Triliun${sisa ? ` ${angkaKeKata(sisa)}` : ''}`;
  }
  return n.toString();
}

export function formatTerbilang(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Nol Rupiah';
  }
  const positiveAmount = Math.floor(Math.abs(amount));
  const kata = angkaKeKata(positiveAmount).trim();
  return `${kata.charAt(0).toUpperCase() + kata.slice(1)} Rupiah`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
