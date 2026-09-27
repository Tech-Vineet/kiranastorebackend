import OpenAI from 'openai';
import { z } from 'zod';
import { config } from './config.js';

export const parsedItemSchema = z.object({ rawText: z.string(), productQuery: z.string().min(1), quantity: z.number().positive().default(1), unit: z.string().nullable().default(null), brand: z.string().nullable().default(null) });
export const parsedMessageSchema = z.object({ intent: z.literal('CREATE_ORDER'), items: z.array(parsedItemSchema).min(1) });
export type ParsedItem = z.infer<typeof parsedItemSchema>;

const numbers: Record<string, number> = { ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, paanch: 5, five: 5 };
const noise = /\b(bhai|mujhe|please|chahiye|chaiye|bhej\s*do|bhej\s*dena|aur|and|need|i|want|de\s*do)\b/gi;
export function localParse(message: string) {
  const parts = message.toLowerCase().replace(/\n/g, ',').split(/,|\s+(?:aur|and)\s+/).map(s => s.trim()).filter(Boolean);
  const items = parts.map(raw => {
    let text = raw.replace(noise, ' ').replace(/\s+/g, ' ').trim();
    const match = text.match(/^(\d+(?:\.\d+)?|ek|one|do|two|teen|three|char|four|paanch|five)?\s*(kilogram|kilo|kg|gram|litre|liter|ml|packets|packet|pkt|g|l)?\s*(.*)$/i)!;
    const quantity = match[1] ? Number(match[1]) || numbers[match[1]] || 1 : 1;
    const unit = match[2]?.replace('kilo', 'kg').replace('liter', 'litre') || null;
    let productQuery = (match[3] || text).trim().replace(/\baata\b/g, 'atta').replace(/\baashirwad\b/g, 'aashirvaad');
    return { rawText: raw, productQuery, quantity, unit, brand: null };
  }).filter(i => i.productQuery);
  return parsedMessageSchema.parse({ intent: 'CREATE_ORDER', items });
}

export async function parseShoppingMessage(message: string) {
  if (config.llmProvider !== 'openai' || !config.llmApiKey) return localParse(message);
  const client = new OpenAI({ apiKey: config.llmApiKey });
  const completion = await client.chat.completions.create({ model: config.openaiModel, response_format: { type: 'json_object' }, temperature: 0,
    messages: [{ role: 'system', content: 'Extract grocery order intent. Return JSON {intent:"CREATE_ORDER",items:[{rawText,productQuery,quantity,unit,brand}]}. No prices. Understand Hinglish.' }, { role: 'user', content: message }] });
  return parsedMessageSchema.parse(JSON.parse(completion.choices[0]?.message.content || '{}'));
}

export async function parseShoppingImage(imageDataUrl: string) {
  if (config.llmProvider !== 'openai' || !config.llmApiKey) throw new Error('Photo ordering requires LLM_PROVIDER=openai and a valid LLM_API_KEY');
  const client = new OpenAI({ apiKey: config.llmApiKey });
  const completion = await client.chat.completions.create({
    model: config.openaiModel, response_format: { type: 'json_object' }, temperature: 0,
    messages: [{ role: 'system', content: 'Read this handwritten or printed Indian grocery shopping list. Return JSON {intent:"CREATE_ORDER",language:"ENGLISH"|"HINGLISH",items:[{rawText,productQuery,quantity,unit,brand}]}. Preserve quantities and units carefully. Do not add prices or invent unreadable items.' }, {
      role: 'user', content: [{ type: 'text', text: 'Extract every readable grocery item from this shopping-list photo.' }, { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } }]
    }]
  });
  const raw = JSON.parse(completion.choices[0]?.message.content || '{}');
  return { parsed: parsedMessageSchema.parse(raw), language: raw.language === 'HINGLISH' ? 'HINGLISH' as const : 'ENGLISH' as const };
}
