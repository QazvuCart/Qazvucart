import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api';
import { errMsg } from '../core/admin-auth';

const FIELDS: { key: string; label: string; rows: number; hint?: string }[] = [
  { key: 'whatsapp_number', label: 'WhatsApp number', rows: 1, hint: 'Digits only with country code, no + or spaces. Used for order requests.' },
  { key: 'instagram_url', label: 'Instagram link', rows: 1, hint: 'Must start with https://' },
  { key: 'contact_email', label: 'Contact email', rows: 1 },
  { key: 'contact_phone', label: 'Contact phone', rows: 1 },
  { key: 'contact_address', label: 'Address', rows: 3 },
  { key: 'about_content', label: 'About page text', rows: 8, hint: 'Separate paragraphs with a blank line. Write only facts about the business.' },
  { key: 'policy_shipping', label: 'Shipping policy', rows: 8 },
  { key: 'policy_returns', label: 'Returns and refunds policy', rows: 8 },
  { key: 'policy_privacy', label: 'Privacy policy', rows: 8 },
  { key: 'policy_terms', label: 'Terms and conditions', rows: 8 },
];

@Component({
  selector: 'qz-settings',
  template: `
    <h1 class="text-3xl md:text-4xl">Settings</h1>
    @if (values(); as v) {
      <form class="mt-6 grid gap-5 max-w-2xl" (submit)="save($event)">
        @for (f of fields; track f.key) {
          <div>
            <label class="lbl" [for]="f.key">{{ f.label }}</label>
            @if (f.hint) { <p class="text-sm mb-1">{{ f.hint }}</p> }
            @if (f.rows === 1) { <input class="field" [id]="f.key" [value]="v[f.key]" (input)="set(f.key, $any($event.target).value)"> }
            @else { <textarea class="field" [id]="f.key" [rows]="f.rows" [value]="v[f.key]" (input)="set(f.key, $any($event.target).value)"></textarea> }
          </div>
        }
        @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
        @if (saved()) { <p role="status" class="font-medium">Settings saved.</p> }
        <div><button class="btn btn-primary">Save settings</button></div>
      </form>
    } @else { <p class="mt-6">Loading…</p> }
  `,
})
export class Settings {
  private api = inject(AdminApi);
  fields = FIELDS;
  values = signal<Record<string, string> | null>(null);
  error = signal(''); saved = signal(false);
  constructor() { this.api.settings().subscribe({ next: (s) => this.values.set(s), error: (e) => this.error.set(errMsg(e)) }); }
  set(k: string, v: string) { this.values.update((s) => ({ ...s!, [k]: v })); this.saved.set(false); }
  save(e: Event) {
    e.preventDefault(); this.error.set('');
    this.api.saveSettings(this.values()!).subscribe({ next: () => this.saved.set(true), error: (er) => this.error.set(errMsg(er)) });
  }
}
