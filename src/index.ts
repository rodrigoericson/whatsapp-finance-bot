import { startBot } from './bot/client.js';
import { closePool } from './db/pool.js';
import { clearReports, scheduleReports } from './jobs/report.job.js';
import { logger } from './logger.js';

logger.info('Iniciando WhatsApp Finance Bot');

await startBot({
  onConnected: (sock) => {
    scheduleReports(sock);
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
  await closePool();
  process.exit(0);
}
