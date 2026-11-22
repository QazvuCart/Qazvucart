import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AdminProductRow {
  id: string; productCode: string; name: string; slug: string; priceMinor: number | null; active: boolean; featured: boolean;
  archivedAt: string | null; updatedAt: string; categoryName: string | null; imageUrl: string | null;
}
export interface AdminCategory { id: string; name: string; slug: string; description: string | null; active: boolean; productCount: number; }
export interface AdminProduct {
  id: string; productCode: string; name: string; slug: string; description: string | null; categoryId: string | null;
  priceMinor: number | null; comparisonPriceMinor: number | null; customisable: boolean; customisationInstructions: string | null;
  active: boolean; featured: boolean;
  images: { publicId: string; url: string; altText: string }[];
  variants: { variantName: string; variantValue: string; additionalPriceMinor: number; active: boolean }[];
}
export interface Stats { products: { total: number; active: number; inactive: number; archived: number }; categories: number; recent: { id: string; name: string; updatedAt: string }[]; }

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private b = '/api/admin';

  stats() { return this.http.get<Stats>(`${this.b}/stats`); }
  categories() { return this.http.get<AdminCategory[]>(`${this.b}/categories`); }
  saveCategory(id: string | null, body: unknown) { return id ? this.http.put(`${this.b}/categories/${id}`, body) : this.http.post(`${this.b}/categories`, body); }
  deleteCategory(id: string) { return this.http.delete(`${this.b}/categories/${id}`); }
  products(q: string, status: string) {
    let p = new HttpParams().set('status', status); if (q) p = p.set('q', q);
    return this.http.get<AdminProductRow[]>(`${this.b}/products`, { params: p });
  }
  product(id: string) { return this.http.get<AdminProduct>(`${this.b}/products/${id}`); }
  saveProduct(id: string | null, body: unknown) { return id ? this.http.put(`${this.b}/products/${id}`, body) : this.http.post(`${this.b}/products`, body); }
  patchProduct(id: string, body: unknown) { return this.http.patch(`${this.b}/products/${id}`, body); }
  deleteProduct(id: string) { return this.http.delete(`${this.b}/products/${id}`); }
  settings() { return this.http.get<Record<string, string>>(`${this.b}/settings`); }
  saveSettings(body: Record<string, string>) { return this.http.put(`${this.b}/settings`, body); }

  /** Validates the file, gets a server signature, then uploads straight to Cloudinary. The server re-checks the asset on save. */
  async uploadImage(file: File): Promise<{ publicId: string; url: string }> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: use a JPG, PNG or WebP image`);
    const s = await firstValueFrom(this.http.post<{ cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; allowed_formats: string; maxBytes: number }>(`${this.b}/uploads/sign`, {}));
    if (file.size > s.maxBytes) throw new Error(`${file.name}: image must be 8 MB or smaller`);
    const fd = new FormData();
    fd.append('file', file); fd.append('api_key', s.apiKey); fd.append('timestamp', String(s.timestamp));
    fd.append('signature', s.signature); fd.append('folder', s.folder); fd.append('allowed_formats', s.allowed_formats);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(`${file.name}: upload failed`);
    const j = await r.json();
    return { publicId: j.public_id, url: j.secure_url };
  }
}
