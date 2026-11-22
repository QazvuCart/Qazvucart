/** Cloudinary delivery transformations: automatic format and quality, width-limited. Other URLs pass through unchanged. */
export const cld = (url: string, w: number) => (url.includes('res.cloudinary.com') && url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`) : url);
export const srcset = (url: string, widths: number[]) => widths.map((w) => `${cld(url, w)} ${w}w`).join(', ');
