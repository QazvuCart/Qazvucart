/** Splits admin-written text into paragraphs. Rendered as plain text, never as HTML. */
export const paragraphs = (s: string | undefined) => (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
