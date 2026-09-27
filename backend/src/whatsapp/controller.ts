import type { Request, Response } from 'express';
import { config } from '../config.js';
import { normalizeWhatsAppWebhook, type WhatsAppMessage, type WhatsAppStatus } from './adapter.js';

const seenMessageIds = new Set<string>();
const rememberMessage = (id: string) => {
  if (!id) return false;
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  if (seenMessageIds.size > 1000) seenMessageIds.delete(seenMessageIds.values().next().value!);
  return false;
};

export function verifyWhatsAppWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && typeof token === 'string' && token === config.metaVerifyToken && config.metaVerifyToken && typeof challenge === 'string') {
    res.status(200).type('text/plain').send(challenge); return;
  }
  res.sendStatus(403);
}

function logMessage(message: WhatsAppMessage) {
  if (rememberMessage(message.messageId)) { console.info(`WHATSAPP EVENT: DUPLICATE_MESSAGE\nMESSAGE ID: ${message.messageId}`); return; }
  if (message.messageType !== 'text') {
    console.info(`WHATSAPP EVENT: UNSUPPORTED_MESSAGE_TYPE\nMESSAGE ID: ${message.messageId}\nFROM: ${message.from}\nPHONE NUMBER ID: ${message.phoneNumberId}\nTYPE: ${message.messageType}`); return;
  }
  console.info(['--- WHATSAPP WEBHOOK ---', 'CHANNEL: whatsapp', `MESSAGE TYPE: ${message.messageType}`, `FROM: ${message.from}`, `MESSAGE ID: ${message.messageId}`, `PHONE NUMBER ID: ${message.phoneNumberId}`, `TEXT: ${message.text}`, `TIMESTAMP: ${message.timestamp}`, '------------------------'].join('\n'));
}

function logStatus(status: WhatsAppStatus) {
  console.info(`WHATSAPP EVENT: MESSAGE_STATUS\nMESSAGE ID: ${status.messageId}\nSTATUS: ${status.status}\nRECIPIENT: ${status.recipientId}\nPHONE NUMBER ID: ${status.phoneNumberId}\nTIMESTAMP: ${status.timestamp}`);
}

export function receiveWhatsAppWebhook(req: Request, res: Response) {
  const events = normalizeWhatsAppWebhook(req.body);
  if (!events.valid) { console.warn('WHATSAPP EVENT: INVALID_WEBHOOK_PAYLOAD'); res.status(400).json({ success: false }); return; }
  // Acknowledge before Phase 2 processing. Current work is limited to safe normalization and development logs.
  res.status(200).json({ success: true });
  for (const message of events.messages) logMessage(message);
  for (const status of events.statuses) logStatus(status);
  if (!events.messages.length && !events.statuses.length) console.info('WHATSAPP EVENT: NO_MESSAGE_OR_STATUS');
}
