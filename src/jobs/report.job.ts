import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { gerarQuemDeve, gerarResumo } from '../services/resumo.service.js';

let dailyTimer: NodeJS.Timeout | null = null;
let weeklyTimer: NodeJS.Timeout | null = null;

export function scheduleReports(sock: WASocket): void {
  clearReports();

  const targetJid = reportTargetJid();

  if (!targetJid) {
    logger.warn('Relatórios automáticos desativados: WA_REPORT_TARGET_JID/ALLOWED_GROUP_ID não configurado');
    return;
  }

  if (env.WA_REPORT_TARGET_JID && env.ALLOWED_GROUP_ID && env.WA_REPORT_TARGET_JID !== env.ALLOWED_GROUP_ID) {
    logger.warn({ allowedGroupId: env.ALLOWED_GROUP_ID, reportTargetJid: env.WA_REPORT_TARGET_JID }, 'Grupo de relatório diferente do grupo permitido');
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
  const targetJid = reportTargetJid();

  if (!targetJid) {
    return;
  }

  const resumo = await gerarResumo({ dsGrupoJid: targetJid, periodoRaw: 'hoje' });
  await sock.sendMessage(targetJid, { text: `☀️ Relatório diário\n\n${resumo}` });
  logger.info({ target: targetJid }, 'Relatório diário enviado');
}

async function sendWeeklyReport(sock: WASocket): Promise<void> {
  const targetJid = reportTargetJid();

  if (!targetJid) {
    return;
  }

  const resumo = await gerarResumo({ dsGrupoJid: targetJid, periodoRaw: 'semana' });
  const ranking = await gerarQuemDeve({ dsGrupoJid: targetJid, periodoRaw: 'semana' });
  await sock.sendMessage(targetJid, { text: `📅 Relatório semanal\n\n${resumo}\n\n${ranking}` });
  logger.info({ target: targetJid }, 'Relatório semanal enviado');
}

function reportTargetJid(): string | undefined {
  return env.WA_REPORT_TARGET_JID ?? env.ALLOWED_GROUP_ID;
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
