import { env } from '../config.js';

export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat(env.LOCALE, {
    style: 'currency',
    currency: env.DEFAULT_CURRENCY,
  }).format(Number(value));
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(env.LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}
