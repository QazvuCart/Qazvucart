import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'QazvuCart — wall posters and custom phone cases', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'products', loadComponent: () => import('./pages/products').then((m) => m.Products) },
  { path: 'products/:slug', loadComponent: () => import('./pages/product-detail').then((m) => m.ProductDetailPage) },
  { path: 'categories/:slug', loadComponent: () => import('./pages/products').then((m) => m.Products) },
  { path: 'about', loadComponent: () => import('./pages/about').then((m) => m.About) },
  { path: 'contact', loadComponent: () => import('./pages/contact').then((m) => m.Contact) },
  { path: 'policies/:slug', loadComponent: () => import('./pages/policy').then((m) => m.Policy) },
  { path: '**', title: 'Page not found — QazvuCart', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
