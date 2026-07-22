import { env } from '../config.js';

export type Periodo = {
  label: string;
  inicio: Date;
  fim: Date;
};

export function parsePeriodo(raw?: string): Periodo {
  const now = new Date();
  const text = raw?.trim().toLowerCase();

  if (!text || text === 'mes' || text === 'mês') {
    return periodoMes(now);
  }

  if (text === 'hoje') {
    return periodoDia(now);
  }

  if (text === 'semana') {
    return periodoSemana(now);
  }

  const monthMatch = text.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return periodoMes(new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1));
  }

  const dayMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    return periodoDia(new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])));
  }

  return periodoMes(now);
}

export function mesReferencia(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  return `${year}-${month}`;
}

function periodoDia(date: Date): Periodo {
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const fim = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  return { label: formatDateLabel(inicio), inicio, fim };
}

function periodoMes(date: Date): Periodo {
  const inicio = new Date(date.getFullYear(), date.getMonth(), 1);
  const fim = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return { label: mesReferencia(inicio), inicio, fim };
}

function periodoSemana(date: Date): Periodo {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7);

  return { label: 'semana atual', inicio, fim };
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(env.LOCALE, { timeZone: env.TIMEZONE }).format(date);
}
