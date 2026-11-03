import { formatMoney } from './format';

describe('formatMoney', () => {
  it('formats USD with two fraction digits', () => {
    expect(formatMoney(12.5, 'USD')).toBe('$12.50');
  });
  it('formats negative amounts with sign', () => {
    expect(formatMoney(-3.5, 'USD')).toBe('-$3.50');
  });
  it('formats money for a given locale', () => {
    expect(formatMoney(1234.5, 'USD', 'uk-UA')).toMatch(/1\s?234,50/);
  });
});
