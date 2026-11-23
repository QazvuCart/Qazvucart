import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { observeReveal, tiltMove, tiltReset } from './motion';

/**
 * Fade/slide an element in when it scrolls into view and out when it leaves.
 *   <h2 qzReveal>..</h2>   <div qzReveal="left" [qzRevealDelay]="120">..</div>
 * Variants: '' (rise), 'left', 'right'. Do not put it on an element that has a [class] binding.
 */
@Directive({ selector: '[qzReveal]' })
export class Reveal {
  variant = input('', { alias: 'qzReveal' });
  delay = input(0, { alias: 'qzRevealDelay' });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let stop = () => {};
    afterNextRender(() => {
      if (this.variant()) el.setAttribute('data-rv', this.variant());
      stop = observeReveal(el, this.delay());
    });
    inject(DestroyRef).onDestroy(() => stop());
  }
}

/** Mouse-only 3D tilt + light glare. Drives --rx/--ry/--mx/--my, styled by .tilt / .glare in styles.css. */
@Directive({
  selector: '[qzTilt]',
  host: { '(pointermove)': 'move($event)', '(pointerleave)': 'leave()' },
})
export class Tilt {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  max = input(6, { alias: 'qzTilt', transform: (v: number | string) => Number(v) || 6 });

  move(e: PointerEvent) { tiltMove(this.el, e, this.max()); }
  leave() { tiltReset(this.el); }
}

/**
 * Fires `inView` when the element is within ~700px of the viewport, and again after each load while it is
 * still there. Used as the "load more" marker at the end of a list, so scrolling never hits a wall.
 */
@Directive({ selector: '[qzInView]' })
export class InView {
  inView = output<void>();

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let io: IntersectionObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.inView.emit();
        io!.unobserve(el); // re-observe shortly: if the marker is still on screen it fires again
        timer = setTimeout(() => io?.observe(el), 150);
      }, { rootMargin: '0px 0px 700px 0px' });
      io.observe(el);
    });
    inject(DestroyRef).onDestroy(() => { clearTimeout(timer); io?.disconnect(); });
  }
}
