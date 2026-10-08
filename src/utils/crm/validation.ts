export function validSlug(value: string) {
  return typeof value === 'string' && value.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) &&
    !['admin', 'auth', 'api', 'rtl', 'login', 'workspaces'].includes(value);
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid record');
  return value;
}
export function text(form: FormData, key: string, max = 160, required = false) {
  const raw = form.get(key);
  if (raw !== null && typeof raw !== 'string') throw new Error(`Invalid ${key}`);
  const value = String(raw || '').trim();
  if (value.length > max || (required && !value)) throw new Error(`Please enter a valid ${key.replaceAll('_', ' ')}`);
  return value;
}
export function email(value: string, required = false) {
  if ((required || value) && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254)) throw new Error('Please enter a valid email');
  return value.toLowerCase();
}
export function phone(value: string) {
  if (!value.trim()) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15 || !/^[+\d\s().-]+$/.test(value)) throw new Error('Please enter a valid phone number');
  return digits;
}
export function money(value: string) {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) throw new Error('Please enter a valid amount');
  return Number(value);
}
export function dateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date and time');
  return date.toISOString();
}
export function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return '/';
  return value;
}
export function pageNumber(value: unknown) {
  return typeof value === 'string' && /^\d{1,6}$/.test(value) ? Math.max(1, Number(value)) : 1;
}
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false; let closed = false;
  input = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else if (!quoted && (field || closed)) throw new Error('Invalid CSV quoting');
      else { if (quoted) closed = true; quoted = !quoted; }
    } else if (char === ',' && !quoted) { row.push(field); field = ''; closed = false; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field); if (row.some(cell => cell.trim())) rows.push(row); row = []; field = ''; closed = false;
    } else { if (closed && !quoted) throw new Error('Invalid CSV quoting'); field += char; }
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  row.push(field); if (row.some(cell => cell.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 501) throw new Error('Import between 1 and 500 leads at a time');
  const headers = rows.shift()!.map(cell => cell.trim().toLowerCase());
  const allowed = ['full_name', 'phone', 'email', 'property_interest', 'city'];
  if (!headers.includes('full_name') || new Set(headers).size !== headers.length || headers.some(h => !allowed.includes(h))) throw new Error(`CSV headers: ${allowed.join(', ')}`);
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Invalid columns on CSV row ${index + 2}`);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i].trim()]));
  });
}
