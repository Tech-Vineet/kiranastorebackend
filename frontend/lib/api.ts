export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export async function request<T>(path: string, init?: RequestInit): Promise<T> { const res = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }); const json = await res.json(); if (!res.ok || !json.success) throw new Error(json.message || 'Request failed'); return json.data; }
export const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
