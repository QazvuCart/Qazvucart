import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from './site-url';

@Injectable({ providedIn: 'root' })
export class Seo {
  private title = inject(Title);
  private meta = inject(Meta);
  private site = inject(SITE_URL);

  set(o: { title: string; description: string; path: string; image?: string | null }) {
    this.title.setTitle(o.title);
    this.meta.updateTag({ name: 'description', content: o.description });
    this.meta.updateTag({ property: 'og:title', content: o.title });
    this.meta.updateTag({ property: 'og:description', content: o.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: this.site + o.path });
    if (o.image) this.meta.updateTag({ property: 'og:image', content: o.image });
    else this.meta.removeTag("property='og:image'");
  }
}
