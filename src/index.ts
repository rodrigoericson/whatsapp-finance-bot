import { startBot } from './bot/client.js';
import { closePool } from './db/pool.js';
import { clearReports, scheduleReports } from './jobs/report.job.js';
import { clearRecorrenciaJob, scheduleRecorrenciaJob } from './jobs/recorrencia.job.js';
import { logger } from './logger.js';

logger.info('Iniciando WhatsApp Finance Bot');

await startBot({
  onConnected: (sock) => {
    scheduleReports(sock);
    scheduleRecorrenciaJob(sock);
  },
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Encerrando bot');
  clearReports();
  clearRecorrenciaJob();
  await closePool();
  process.exit(0);
}
