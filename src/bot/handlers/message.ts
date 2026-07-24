import type { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { env } from '../../config.js';
import { logger } from '../../logger.js';
import { handleCommand } from './commands.js';
import { handleNatural } from './natural.js';

export async function handleMessage(sock: WASocket, message: WAMessage): Promise<void> {
  const remoteJid = message.key.remoteJid;

  if (!remoteJid || !remoteJid.endsWith('@g.us')) {
    return;
  }

  if (message.key.fromMe && !env.ALLOW_FROM_ME) {
    return;
  }

  if (!env.ALLOWED_GROUP_ID && !env.ALLOW_ALL_GROUPS) {
    logger.warn({ remoteJid }, 'Mensagem ignorada: ALLOWED_GROUP_ID não configurado');
    return;
  }

  if (env.ALLOWED_GROUP_ID && remoteJid !== env.ALLOWED_GROUP_ID) {
    return;
  }

  const texto = extractText(message);

  if (!texto) {
    return;
  }

  const participant = message.key.participant ?? remoteJid;
  const nrTelefone = participant.split('@')[0];
  const autor = {
    nrTelefone,
    nmApelido: message.pushName ?? nrTelefone,
    nmPushname: message.pushName ?? null,
  };
  const context = {
    texto,
    autor,
    dsGrupoJid: remoteJid,
    nrMensagemWaId: message.key.id ?? null,
  };

  const response = (await handleCommand(context)) ?? (await handleNatural(context));

  if (!response) {
    return;
  }

  await sock.sendMessage(remoteJid, { text: response }, { quoted: message });
  logger.info({ remoteJid, participant, command: texto.split(/\s+/)[0] }, 'Mensagem processada');
}

function extractText(message: WAMessage): string | null {
  const content = message.message;

  if (!content) {
    return null;
  }

  if (content.conversation) {
    return content.conversation;
  }

  if (content.extendedTextMessage?.text) {
    return content.extendedTextMessage.text;
  }

  if (content.imageMessage?.caption) {
    return content.imageMessage.caption;
  }

  if (content.videoMessage?.caption) {
    return content.videoMessage.caption;
  }

  return null;
}
