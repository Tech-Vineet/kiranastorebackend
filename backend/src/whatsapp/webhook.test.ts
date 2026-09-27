import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { config } from '../config.js';
import { normalizeWhatsAppWebhook } from './adapter.js';

let server: Server; let baseUrl = '';
const payload = (messages?: unknown[], statuses?: unknown[]) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123456' }, messages, statuses } }] }] });

beforeAll(async () => {
  config.metaVerifyToken = 'test-verify-token';
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => resolve()); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Test server did not start');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

describe('WhatsApp webhook verification', () => {
  it('returns the challenge for the configured token', async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123`);
    expect(response.status).toBe(200); expect(await response.text()).toBe('abc123');
  });
  it('rejects an incorrect token', async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`);
    expect(response.status).toBe(403);
  });
});

describe('WhatsApp payload adapter', () => {
  it('normalizes a text message without invoking application services', () => {
    const result = normalizeWhatsAppWebhook(payload([{ id: 'wamid.1', from: '919999999999', type: 'text', timestamp: '1720000000', text: { body: '2kg atta aur 1 oil' } }]));
    expect(result.messages[0]).toEqual({ channel: 'whatsapp', messageId: 'wamid.1', from: '919999999999', messageType: 'text', text: '2kg atta aur 1 oil', timestamp: '2024-07-03T09:46:40.000Z', phoneNumberId: '123456' });
  });
  it('acknowledges unsupported messages and status events safely', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const body = payload([{ id: 'wamid.image', from: '919999999999', type: 'image', timestamp: '1720000000' }], [{ id: 'wamid.sent', status: 'delivered', recipient_id: '919999999999', timestamp: '1720000001' }]);
    const response = await fetch(`${baseUrl}/api/webhooks/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect(response.status).toBe(200); expect(info.mock.calls.flat().join('\n')).toContain('UNSUPPORTED_MESSAGE_TYPE'); expect(info.mock.calls.flat().join('\n')).toContain('MESSAGE_STATUS'); info.mockRestore();
  });
  it('rejects non-WhatsApp payloads without crashing', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = await fetch(`${baseUrl}/api/webhooks/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400); warning.mockRestore();
  });
});
