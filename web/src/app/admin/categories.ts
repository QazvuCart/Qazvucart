import { Component, inject, signal } from '@angular/core';
import { AdminApi, AdminCategory } from '../core/admin-api';
import { errMsg } from '../core/admin-auth';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

@Component({
  selector: 'qz-categories',
  template: `
    <h1 class="text-3xl md:text-4xl">Categories</h1>
    <form class="mt-6 rounded-2xl bg-sage-soft p-5 grid gap-4 md:grid-cols-2" (submit)="save($event)">
      <h2 class="text-xl md:col-span-2">{{ editId() ? 'Edit category' : 'New category' }}</h2>
      <div><label class="lbl" for="n">Name</label><input id="n" class="field" required maxlength="80" [value]="name()" (input)="onName($any($event.target).value)"></div>
      <div><label class="lbl" for="sl">Slug</label><input id="sl" class="field" required maxlength="80" [value]="slug()" (input)="slug.set($any($event.target).value); touched = true"></div>
      <div class="md:col-span-2"><label class="lbl" for="d">Description (optional)</label><textarea id="d" rows="2" class="field" maxlength="500" [value]="desc()" (input)="desc.set($any($event.target).value)"></textarea></div>
      <label class="flex items-center gap-3 min-h-11"><input type="checkbox" class="size-5" [checked]="active()" (change)="active.set($any($event.target).checked)"> Active</label>
      <div class="flex gap-3 md:justify-end">
        @if (editId()) { <button type="button" class="btn btn-quiet" (click)="reset()">Cancel</button> }
        <button class="btn btn-primary">{{ editId() ? 'Save changes' : 'Add category' }}</button>
      </div>
      @if (error()) { <p class="err md:col-span-2" role="alert">{{ error() }}</p> }
    </form>

    @if (rows(); as list) {
      @if (!list.length) { <p class="mt-8">No categories yet.</p> }
      <ul class="mt-8 divide-y divide-forest/15 list-none p-0">
        @for (c of list; track c.id) {
          <li class="py-3 flex flex-wrap items-center justify-between gap-3">
            <div><p class="font-semibold">{{ c.name }}</p><p class="text-sm">/{{ c.slug }} · {{ c.productCount }} products · {{ c.active ? 'Active' : 'Inactive' }}</p></div>
            <div class="flex gap-2">
              <button type="button" class="btn btn-quiet btn-sm" (click)="edit(c)">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" (click)="remove(c)">Delete</button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class Categories {
  private api = inject(AdminApi);
  rows = signal<AdminCategory[] | null>(null);
  editId = signal<string | null>(null);
  name = signal(''); slug = signal(''); desc = signal(''); active = signal(true); error = signal('');
  touched = false;
  constructor() { this.load(); }

  load() { this.api.categories().subscribe({ next: (r) => this.rows.set(r), error: (e) => this.error.set(errMsg(e)) }); }
  onName(v: string) { this.name.set(v); if (!this.touched) this.slug.set(slugify(v)); }
  edit(c: AdminCategory) { this.editId.set(c.id); this.name.set(c.name); this.slug.set(c.slug); this.desc.set(c.description ?? ''); this.active.set(c.active); this.touched = true; window.scrollTo({ top: 0 }); }
  reset() { this.editId.set(null); this.name.set(''); this.slug.set(''); this.desc.set(''); this.active.set(true); this.touched = false; this.error.set(''); }
  save(e: Event) {
    e.preventDefault();
    this.api.saveCategory(this.editId(), { name: this.name(), slug: this.slug(), description: this.desc() || null, active: this.active() })
      .subscribe({ next: () => { this.reset(); this.load(); }, error: (er) => this.error.set(errMsg(er)) });
  }
  remove(c: AdminCategory) {
    if (!confirm(`Delete category "${c.name}"? Its ${c.productCount} products are kept but will have no category.`)) return;
    this.api.deleteCategory(c.id).subscribe({ next: () => this.load(), error: (er) => this.error.set(errMsg(er)) });
  }
}
