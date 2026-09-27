import type { ParsedItem } from './parser.js';

export type CatalogProduct = { _id: unknown; name: string; brand?: string | null; aliases?: string[]; variant?: string; unit?: string; quantity?: number; price: number; stock: number; isAvailable: boolean };
const norm = (s = '') => s.toLowerCase().replace(/aata/g, 'atta').replace(/ashirwad/g, 'aashirvaad').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
export function resolveProduct(products: CatalogProduct[], item: ParsedItem) {
  const q = norm(item.productQuery); const brand = norm(item.brand || '');
  const available = products.filter(p => p.isAvailable && p.stock > 0);
  let matches = available.filter(p => norm(p.name) === q);
  if (!matches.length) matches = available.filter(p => (p.aliases || []).some(a => norm(a) === q));
  if (!matches.length && brand) matches = available.filter(p => norm(p.brand || '') === brand && (norm(p.name).includes(q) || (p.aliases || []).some(a => norm(a).includes(q))));
  if (!matches.length) matches = available.filter(p => norm(p.name).includes(q) || q.includes(norm(p.name)) || (p.aliases || []).some(a => norm(a).includes(q) || q.includes(norm(a))));
  if (item.unit) {
    const unit = norm(item.unit); const unitMatches = matches.filter(p => norm(p.variant || '').includes(`${item.quantity}${unit}`) || (norm(p.unit || '') === unit && p.quantity === item.quantity));
    if (unitMatches.length) matches = unitMatches;
  }
  if (!matches.length) return { status: 'NOT_FOUND' as const, query: item.productQuery, options: [] };
  if (matches.length > 1) return { status: 'AMBIGUOUS' as const, query: item.productQuery, options: matches };
  return { status: 'RESOLVED' as const, query: item.productQuery, product: matches[0]!, options: matches };
}
