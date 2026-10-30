// Ported from web/src/lib/format.ts.
export function formatMoney(amount: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}
