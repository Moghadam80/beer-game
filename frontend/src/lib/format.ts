const formatter = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return formatter.format(value);
}
