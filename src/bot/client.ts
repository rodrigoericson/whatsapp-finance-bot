import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type ConnectionState,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { handleMessage } from './handlers/message.js';

type StartBotOptions = {
  onConnected?: (sock: WASocket) => void;
};

export async function startBot(options: StartBotOptions = {}): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(env.WA_SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger: logger.child({ module: 'baileys' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    handleConnectionUpdate(sock, update, options);
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') {
      return;
    }

    for (const message of messages) {
      try {
        await handleMessage(sock, message);
      } catch (error) {
        logger.error({ error }, 'Falha ao processar mensagem');
      }
    }
  });

  return sock;
}

function handleConnectionUpdate(sock: WASocket, update: Partial<ConnectionState>, options: StartBotOptions): void {
  if (update.qr) {
    logger.info('QR recebido. Escaneie com o WhatsApp.');
    qrcode.generate(update.qr, { small: true });
  }

  if (update.connection === 'open') {
    logger.info('WhatsApp conectado');
    options.onConnected?.(sock);
    return;
  }

  if (update.connection !== 'close') {
    return;
  }

  const statusCode = getStatusCode(update.lastDisconnect?.error);

  if (statusCode === DisconnectReason.loggedOut) {
    logger.error('Sessão encerrada. Rode npm run reset-auth e escaneie o QR novamente.');
    return;
  }

  logger.warn({ statusCode }, 'Conexão fechada. Reiniciando bot.');
  setTimeout(() => {
    void startBot(options);
  }, 5000);
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('output' in error)) {
    return undefined;
  }

  const output = (error as { output?: { statusCode?: number } }).output;
  return output?.statusCode;
}
