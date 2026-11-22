import { Routes } from '@angular/router';
import { adminGuard } from './core/admin-auth';

export const routes: Routes = [
  { path: '', title: 'QazvuCart — wall posters and custom phone cases', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'products', loadComponent: () => import('./pages/products').then((m) => m.Products) },
  { path: 'products/:slug', loadComponent: () => import('./pages/product-detail').then((m) => m.ProductDetailPage) },
  { path: 'categories/:slug', loadComponent: () => import('./pages/products').then((m) => m.Products) },
  { path: 'about', loadComponent: () => import('./pages/about').then((m) => m.About) },
  { path: 'contact', loadComponent: () => import('./pages/contact').then((m) => m.Contact) },
  { path: 'policies/:slug', loadComponent: () => import('./pages/policy').then((m) => m.Policy) },
  { path: 'admin/login', title: 'Admin login', loadComponent: () => import('./admin/login').then((m) => m.AdminLogin) },
  {
    path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./admin/shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', title: 'Dashboard — Admin', loadComponent: () => import('./admin/dashboard').then((m) => m.Dashboard) },
      { path: 'products', title: 'Products — Admin', loadComponent: () => import('./admin/products-list').then((m) => m.ProductsList) },
      { path: 'products/:id', title: 'Product — Admin', loadComponent: () => import('./admin/product-form').then((m) => m.ProductForm) },
      { path: 'categories', title: 'Categories — Admin', loadComponent: () => import('./admin/categories').then((m) => m.Categories) },
      { path: 'settings', title: 'Settings — Admin', loadComponent: () => import('./admin/settings').then((m) => m.Settings) },
    ],
  },
  { path: '**', title: 'Page not found — QazvuCart', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
