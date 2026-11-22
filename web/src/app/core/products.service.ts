import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Category, ProductCard, ProductDetail, PublicSettings } from './product.model';

export interface ListParams { q?: string; category?: string; sort?: string; featured?: boolean; }

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);

  list(p: ListParams = {}): Observable<ProductCard[]> {
    let params = new HttpParams();
    if (p.q) params = params.set('q', p.q);
    if (p.category) params = params.set('category', p.category);
    if (p.sort) params = params.set('sort', p.sort);
    if (p.featured) params = params.set('featured', 'true');
    return this.http.get<ProductCard[]>('/api/products', { params });
  }
  detail(slug: string) { return this.http.get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`); }
  categories() { return this.http.get<Category[]>('/api/categories'); }
  settings$ = this.http.get<PublicSettings>('/api/settings').pipe(shareReplay(1));
}
