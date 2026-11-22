import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { PublicSettings } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { SITE_URL } from '../core/site-url';
import { Selection, buildOrderMessage, buildWhatsAppUrl, mapsLinkFromCoords, safeHttps, validateOrder } from '../core/whatsapp';

@Component({
  selector: 'qz-order-form',
  template: `
    <section class="mt-8" aria-labelledby="order-h">
      <h2 id="order-h" class="text-2xl">Order on WhatsApp</h2>
      <p class="mt-1 text-sm">There is no online payment. Your request opens in WhatsApp, where QazvuCart confirms availability, delivery charges and payment.</p>

      @if (settings() === null) {
        <p class="mt-4">Loading…</p>
      } @else if (!waUrlBase()) {
        <p class="mt-4 rounded-xl bg-sage-soft p-4" role="status">Ordering on WhatsApp is not available yet because the store's WhatsApp number has not been set.</p>
      } @else if (sent()) {
        <div class="mt-4 rounded-2xl bg-sage-soft p-5" role="status">
          <p class="font-semibold">Your order request is ready in WhatsApp. Send the message to contact QazvuCart. Our team will confirm availability, delivery charges and payment instructions there.</p>
          <p class="mt-3 text-sm">Nothing is placed until you send the message in WhatsApp and QazvuCart confirms it.</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <a class="btn btn-primary" [href]="sent()!" target="_blank" rel="noopener">Open WhatsApp again</a>
            <button type="button" class="btn btn-quiet" (click)="sent.set(null)">Edit request</button>
          </div>
          @if (preview(); as m) {
            <details class="mt-4"><summary class="cursor-pointer font-medium">View the message</summary>
              <pre class="mt-2 whitespace-pre-wrap break-words rounded-xl bg-porcelain p-4 text-sm font-sans" tabindex="0">{{ m }}</pre></details>
          }
          @if (instagram(); as ig) {
            <div class="mt-5 border-t border-forest/20 pt-4">
              <p class="text-sm">Prefer Instagram? Instagram cannot pre-fill the message, so copy it first and paste it into a direct message.</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <button type="button" class="btn btn-quiet btn-sm" (click)="copy()">{{ copied() ? 'Copied' : 'Copy request text' }}</button>
                <a class="btn btn-quiet btn-sm" [href]="ig" target="_blank" rel="noopener">Open Instagram</a>
              </div>
              @if (copyFailed()) { <p class="err mt-2" role="alert">Could not copy automatically. Open the message below and copy it manually.</p> }
            </div>
          }
        </div>
      } @else {
        <form class="mt-4 grid gap-4" (submit)="submit($event)" novalidate>
          <div>
            <label class="lbl" for="o-name">Your name</label>
            <input id="o-name" class="field" autocomplete="name" maxlength="80" [value]="name()" (input)="name.set($any($event.target).value)"
                   [attr.aria-invalid]="show() && errors().name ? true : null" [attr.aria-describedby]="show() && errors().name ? 'e-name' : null">
            @if (show() && errors().name) { <p id="e-name" class="err text-sm mt-1">{{ errors().name }}</p> }
          </div>
          <div>
            <label class="lbl" for="o-phone">Your phone number</label>
            <input id="o-phone" class="field" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" [value]="phone()" (input)="phone.set($any($event.target).value)"
                   [attr.aria-invalid]="show() && errors().phone ? true : null" [attr.aria-describedby]="show() && errors().phone ? 'e-phone' : null">
            @if (show() && errors().phone) { <p id="e-phone" class="err text-sm mt-1">{{ errors().phone }}</p> }
          </div>
          <div>
            <label class="lbl" for="o-address">Complete delivery address</label>
            <textarea id="o-address" class="field" rows="4" maxlength="400" autocomplete="street-address" [value]="address()" (input)="address.set($any($event.target).value)"
                      [attr.aria-invalid]="show() && errors().address ? true : null" [attr.aria-describedby]="show() && errors().address ? 'e-address' : null"></textarea>
            @if (show() && errors().address) { <p id="e-address" class="err text-sm mt-1">{{ errors().address }}</p> }
          </div>
          <div>
            <label class="lbl" for="o-maps">Google Maps location (optional)</label>
            <p class="text-sm mb-1">Paste a Google Maps link, or share your location from this device. Location is never requested unless you press the button.</p>
            <input id="o-maps" class="field" type="url" inputmode="url" autocomplete="off" maxlength="500" placeholder="https://maps.app.goo.gl/…" [value]="maps()" (input)="maps.set($any($event.target).value)"
                   [attr.aria-invalid]="show() && errors().mapsLink ? true : null" [attr.aria-describedby]="show() && errors().mapsLink ? 'e-maps' : null">
            @if (show() && errors().mapsLink) { <p id="e-maps" class="err text-sm mt-1">{{ errors().mapsLink }}</p> }
            <div class="mt-2 flex flex-wrap gap-3">
              <button type="button" class="btn btn-quiet btn-sm" (click)="shareLocation()" [disabled]="locating()">{{ locating() ? 'Getting location…' : 'Share my location' }}</button>
              @if (maps()) { <button type="button" class="btn btn-quiet btn-sm" (click)="maps.set(''); locMsg.set('')">Clear location</button> }
            </div>
            @if (locMsg()) { <p class="text-sm mt-2" role="status">{{ locMsg() }}</p> }
          </div>

          @if (preview(); as m) {
            <div>
              <h3 class="text-lg">Review your request</h3>
              <pre class="mt-2 whitespace-pre-wrap break-words rounded-xl bg-sage-soft p-4 text-sm font-sans" tabindex="0">{{ m }}</pre>
            </div>
          }

          @if (show() && errorList().length) {
            <p class="err" role="alert">Please fix: {{ errorList().join(' ') }}</p>
          }
          @if (blocker(); as b) { <p class="font-medium" role="status">{{ b }}</p> }
          <div>
            <button class="btn btn-primary w-full sm:w-auto" [disabled]="!!blocker()">Order on WhatsApp</button>
          </div>
        </form>
      }
    </section>
  `,
})
export class OrderForm {
  product = input.required<{ name: string; slug: string; productCode: string; customisable: boolean }>();
  selections = input.required<Selection[]>();
  unitMinor = input.required<number | null>();
  qty = input.required<number>();
  canOrder = input.required<boolean>();
  missing = input.required<string[]>();
  note = input.required<string>();

  private site = inject(SITE_URL);
  /** null while loading */
  settings = toSignal(inject(ProductsService).settings$.pipe(catchError(() => of({} as PublicSettings))), { initialValue: null });
  waNumber = computed(() => this.settings()?.whatsapp_number);
  waUrlBase = computed(() => buildWhatsAppUrl(this.waNumber(), '') !== null);
  instagram = computed(() => safeHttps(this.settings()?.instagram_url));

  name = signal(''); phone = signal(''); address = signal(''); maps = signal('');
  attempted = signal(false);
  locating = signal(false); locMsg = signal('');
  sent = signal<string | null>(null);
  copied = signal(false); copyFailed = signal(false);

  constructor() {
    // A new product starts a fresh request (customer details are kept).
    effect(() => { this.product().slug; untracked(() => { this.sent.set(null); this.attempted.set(false); }); });
  }

  private checked = computed(() => validateOrder({
    name: this.name(), phone: this.phone(), address: this.address(), mapsLink: this.maps(), customisation: this.note(),
  }));
  errors = computed(() => this.checked().errors);
  errorList = computed(() => Object.values(this.errors()));
  show = computed(() => this.attempted());

  private message = computed(() => {
    const unit = this.unitMinor();
    if (unit === null || !this.canOrder() || this.errorList().length) return null;
    const p = this.product();
    const origin = this.site || (typeof location !== 'undefined' ? location.origin : '');
    return buildOrderMessage({
      productName: p.name, productCode: p.productCode, productUrl: `${origin}/products/${encodeURIComponent(p.slug)}`,
      selections: this.selections(), quantity: this.qty(), unitMinor: unit, customer: this.checked().values,
    });
  });
  preview = this.message;

  /** Why the order button is disabled, or '' when it can be used. Only product-level problems disable it. */
  blocker = computed(() => {
    if (this.unitMinor() === null) return 'This product cannot be ordered until its price is set.';
    if (this.missing().length) return `Choose: ${this.missing().join(', ')}.`;
    if (this.qty() < 1) return 'Choose a quantity.';
    return '';
  });

  submit(e: Event) {
    e.preventDefault();
    this.attempted.set(true);
    const msg = this.message();
    if (!msg || this.blocker()) return;
    const url = buildWhatsAppUrl(this.waNumber(), msg);
    if (!url) return;
    this.copied.set(false); this.copyFailed.set(false);
    this.sent.set(url);
    window.open(url, '_blank', 'noopener');
  }

  shareLocation() {
    this.locMsg.set('');
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.locMsg.set('This device cannot share location here. Paste a Google Maps link instead, or leave it empty.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        const link = mapsLinkFromCoords(pos.coords.latitude, pos.coords.longitude);
        if (link) { this.maps.set(link); this.locMsg.set('Location added as a Google Maps link. You can edit or clear it before ordering.'); }
        else this.locMsg.set('Could not read a valid location. Paste a Google Maps link instead.');
      },
      (err) => {
        this.locating.set(false);
        this.locMsg.set(err.code === err.PERMISSION_DENIED
          ? 'Location permission was denied. You can still order: paste a Google Maps link, or leave it empty.'
          : 'Could not get your location. Paste a Google Maps link instead, or leave it empty.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }

  async copy() {
    const msg = this.message();
    if (!msg) return;
    try { await navigator.clipboard.writeText(msg); this.copied.set(true); this.copyFailed.set(false); }
    catch { this.copyFailed.set(true); }
  }
}
