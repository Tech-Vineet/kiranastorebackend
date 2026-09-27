export type WhatsAppMessage = {
  channel: 'whatsapp';
  messageId: string;
  from: string;
  messageType: string;
  text: string | null;
  timestamp: string;
  phoneNumberId: string;
};

export type WhatsAppStatus = {
  channel: 'whatsapp';
  messageId: string;
  status: string;
  recipientId: string;
  timestamp: string;
  phoneNumberId: string;
};

export type WhatsAppWebhookEvents = {
  valid: boolean;
  messages: WhatsAppMessage[];
  statuses: WhatsAppStatus[];
};

const record = (value: unknown): Record<string, any> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
const string = (value: unknown) => typeof value === 'string' ? value : '';
const isoTimestamp = (value: unknown) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
};

export function normalizeWhatsAppWebhook(payload: unknown): WhatsAppWebhookEvents {
  const root = record(payload);
  const result: WhatsAppWebhookEvents = { valid: root?.object === 'whatsapp_business_account', messages: [], statuses: [] };
  if (!result.valid || !Array.isArray(root?.entry)) return result;

  for (const entry of root.entry) {
    if (!Array.isArray(record(entry)?.changes)) continue;
    for (const change of record(entry)!.changes) {
      const value = record(record(change)?.value);
      if (!value || record(change)?.field !== 'messages') continue;
      const phoneNumberId = string(record(value.metadata)?.phone_number_id);

      if (Array.isArray(value.messages)) for (const raw of value.messages) {
        const message = record(raw); if (!message) continue;
        const messageType = string(message.type) || 'unknown';
        result.messages.push({
          channel: 'whatsapp', messageId: string(message.id), from: string(message.from), messageType,
          text: messageType === 'text' ? string(record(message.text)?.body) : null,
          timestamp: isoTimestamp(message.timestamp), phoneNumberId,
        });
      }

      if (Array.isArray(value.statuses)) for (const raw of value.statuses) {
        const status = record(raw); if (!status) continue;
        result.statuses.push({
          channel: 'whatsapp', messageId: string(status.id), status: string(status.status) || 'unknown',
          recipientId: string(status.recipient_id), timestamp: isoTimestamp(status.timestamp), phoneNumberId,
        });
      }
    }
  }
  return result;
}
