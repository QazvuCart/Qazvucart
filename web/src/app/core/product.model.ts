export interface ProductImage { url: string; alt: string; width: number | null; height: number | null; }

/** Shape returned by GET /api/products. priceMinor is integer paise; null means "price not set". */
export interface ProductCard {
  slug: string;
  name: string;
  priceMinor: number | null;
  customisable: boolean;
  image: ProductImage | null;
}

export interface Variant { id: string; name: string; value: string; additionalPriceMinor: number; }

export interface ProductDetail {
  productCode: string;
  slug: string;
  name: string;
  description: string | null;
  priceMinor: number | null;
  customisable: boolean;
  customisationInstructions: string | null;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
  variants: Variant[];
}

export interface Category { slug: string; name: string; description: string | null; }
export type PublicSettings = Partial<Record<
  'about_content' | 'contact_email' | 'contact_phone' | 'contact_address' | 'instagram_url' | 'whatsapp_number' |
  'policy_shipping' | 'policy_returns' | 'policy_privacy' | 'policy_terms', string>>;

/** Integer-only money formatting (no float arithmetic on amounts). */
export function formatMinor(minor: number): string {
  const rupees = Math.floor(minor / 100);
  const paise = minor % 100;
  return `₹${new Intl.NumberFormat('en-IN').format(rupees)}${paise ? '.' + String(paise).padStart(2, '0') : ''}`;
}
