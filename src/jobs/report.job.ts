import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { gerarQuemDeve, gerarResumo } from '../services/resumo.service.js';

let dailyTimer: NodeJS.Timeout | null = null;
let weeklyTimer: NodeJS.Timeout | null = null;

export function scheduleReports(sock: WASocket): void {
  clearReports();

  if (!env.WA_REPORT_TARGET_JID) {
    logger.warn('Relatórios automáticos desativados: WA_REPORT_TARGET_JID não configurado');
    return;
  }

  if (env.WA_REPORT_DAILY_ENABLED) {
    dailyTimer = scheduleNextDaily(sock);
  }

  if (env.WA_REPORT_WEEKLY_ENABLED) {
    weeklyTimer = scheduleNextWeekly(sock);
  }
}

export function clearReports(): void {
  if (dailyTimer) {
    clearTimeout(dailyTimer);
    dailyTimer = null;
  }

  if (weeklyTimer) {
    clearTimeout(weeklyTimer);
    weeklyTimer = null;
  }
}

function scheduleNextDaily(sock: WASocket): NodeJS.Timeout {
  const next = nextDateAt(env.WA_REPORT_DAILY_HOUR, env.WA_REPORT_DAILY_MINUTE);
  const delay = next.getTime() - Date.now();

  logger.info({ next }, 'Relatório diário agendado');

  return setTimeout(() => {
    void sendDailyReport(sock).finally(() => {
      dailyTimer = scheduleNextDaily(sock);
    });
  }, delay);
}

function scheduleNextWeekly(sock: WASocket): NodeJS.Timeout {
  const next = nextWeekdayAt(env.WA_REPORT_WEEKLY_DAY, env.WA_REPORT_WEEKLY_HOUR, env.WA_REPORT_WEEKLY_MINUTE);
  const delay = next.getTime() - Date.now();

  logger.info({ next }, 'Relatório semanal agendado');

  return setTimeout(() => {
    void sendWeeklyReport(sock).finally(() => {
      weeklyTimer = scheduleNextWeekly(sock);
    });
  }, delay);
}

async function sendDailyReport(sock: WASocket): Promise<void> {
  if (!env.WA_REPORT_TARGET_JID) {
    return;
  }

  const resumo = await gerarResumo({ dsGrupoJid: env.WA_REPORT_TARGET_JID, periodoRaw: 'hoje' });
  await sock.sendMessage(env.WA_REPORT_TARGET_JID, { text: `☀️ Relatório diário\n\n${resumo}` });
  logger.info({ target: env.WA_REPORT_TARGET_JID }, 'Relatório diário enviado');
}

async function sendWeeklyReport(sock: WASocket): Promise<void> {
  if (!env.WA_REPORT_TARGET_JID) {
    return;
  }

  const resumo = await gerarResumo({ dsGrupoJid: env.WA_REPORT_TARGET_JID, periodoRaw: 'semana' });
  const ranking = await gerarQuemDeve({ dsGrupoJid: env.WA_REPORT_TARGET_JID, periodoRaw: 'semana' });
  await sock.sendMessage(env.WA_REPORT_TARGET_JID, { text: `📅 Relatório semanal\n\n${resumo}\n\n${ranking}` });
  logger.info({ target: env.WA_REPORT_TARGET_JID }, 'Relatório semanal enviado');
}

function nextDateAt(hour: number, minute: number): Date {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function nextWeekdayAt(day: number, hour: number, minute: number): Date {
  const next = nextDateAt(hour, minute);
  const daysUntil = (day - next.getDay() + 7) % 7;

  if (daysUntil > 0) {
    next.setDate(next.getDate() + daysUntil);
  }

  return next;
}
