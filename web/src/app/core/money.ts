/** Parses "499" or "499.50" into integer paise without floating-point maths. '' gives null, invalid input gives undefined. */
export function parseMoney(input: string): number | null | undefined {
  const t = input.trim().replace(/,/g, '');
  if (!t) return null;
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(t);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : undefined;
}
export const moneyToInput = (minor: number | null) => (minor === null ? '' : `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`);
