import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { listarGruposComRecorrenciasAtivas } from '../db/repositories/recorrencia.repo.js';
import { gerarLancamentosRecorrentes } from '../services/recorrencia.service.js';

let recorrenciaTimer: NodeJS.Timeout | null = null;

export function scheduleRecorrenciaJob(sock: WASocket): void {
  clearRecorrenciaJob();

  if (!env.WA_RECORRENCIA_ENABLED) {
    logger.info('Job de recorrência desativado por config');
    return;
  }

  recorrenciaTimer = scheduleNext(sock);
}

export function clearRecorrenciaJob(): void {
  if (recorrenciaTimer) {
    clearTimeout(recorrenciaTimer);
    recorrenciaTimer = null;
  }
}

function scheduleNext(sock: WASocket): NodeJS.Timeout {
  const next = nextDateAt(env.WA_RECORRENCIA_HOUR, env.WA_RECORRENCIA_MINUTE);
  const delay = next.getTime() - Date.now();

  logger.info({ next }, 'Job de recorrência agendado');

  return setTimeout(() => {
    void runRecorrenciaJob(sock).finally(() => {
      recorrenciaTimer = scheduleNext(sock);
    });
  }, delay);
}

async function runRecorrenciaJob(sock: WASocket): Promise<void> {
  const grupos = await listarGruposComRecorrenciasAtivas();

  for (const dsGrupoJid of grupos) {
    try {
      const resultado = await gerarLancamentosRecorrentes(dsGrupoJid);

      if (resultado.gerados > 0) {
        const msg = `🔁 Recorrências processadas (${resultado.gerados}):\n\n${resultado.mensagens.join('\n')}`;
        await sock.sendMessage(dsGrupoJid, { text: msg });
      }

      logger.info({ dsGrupoJid, gerados: resultado.gerados }, 'Recorrências geradas');
    } catch (error) {
      logger.error({ error, dsGrupoJid }, 'Falha ao processar recorrências do grupo');
    }
  }
}

function nextDateAt(hour: number, minute: number): Date {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}
