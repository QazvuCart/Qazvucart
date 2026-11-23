/**
 * Spatial motion helpers. Pure DOM, no Angular imports.
 * Browser only: call from afterNextRender / ngAfterViewInit, never during SSR.
 *
 * Performance rules used everywhere in here:
 *  - only transform + opacity are animated (compositor friendly, no layout/paint per frame)
 *  - one passive scroll listener, one requestAnimationFrame loop, and the loop sleeps when nothing moves
 *  - only cards near the viewport are updated (IntersectionObserver), and no layout reads per card
 *    except offsetTop (which is layout-based and never forces a re-layout after transform writes)
 *  - prefers-reduced-motion: every helper turns itself off and content stays in its plain state
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Document-space top of an element, ignoring any transforms (offsetTop is layout-only). */
function docTop(el: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return y;
}

/* ------------------------------------------------------------------ */
/* Curved spatial grid                                                 */
/* ------------------------------------------------------------------ */

interface Pose { ty: number; tz: number; rx: number; ry: number; s: number; o: number; }
const POSE_KEYS: (keyof Pose)[] = ['ty', 'tz', 'rx', 'ry', 's', 'o'];

interface Item { el: HTMLElement; c: number; live: boolean; seen: boolean; cur: Pose | null; }

/**
 * The grid is bent like a curved wall. `p` is the card's vertical position relative to the viewport
 * centre (-1 top edge, 0 centre, 1 bottom edge) and `c` is its column (-1 left, 0 middle, 1 right).
 *  - columns face the viewer (rotateY) and the outer ones sit a little closer (concave wall)
 *  - cards tilt like a drum as they roll through the viewport (rotateX) and recede in depth
 *  - the middle column drifts at a slightly different speed (parallax)
 *  - cards fade and shrink as they leave, and fade/scale in as they arrive
 */
function poseFor(p: number, c: number, vel: number, mobile: boolean): Pose {
  const a = Math.abs(p);
  const kx = mobile ? 7 : 12;
  const ky = mobile ? 7 : 13;
  const depth = mobile ? 70 : 130;
  const side = mobile ? 0 : 32; // phones: keep the outer column inside the screen edge
  const drift = mobile ? 26 : 56; // columns slide past each other vertically
  const lean = clamp(vel * 7, -9, 9) * (mobile ? 0.8 : 1); // cards tip with scroll speed, settle when you stop
  const twist = Math.min(Math.abs(vel) * 5, 7); // outer columns swing open while scrolling fast
  return {
    ty: p * drift * (1 - 1.7 * Math.abs(c)),
    tz: -Math.pow(a, 1.6) * depth + c * c * side,
    rx: -p * kx + lean,
    ry: -c * (ky + twist),
    s: 1 - a * a * 0.07,
    o: 1 - smoothstep(0.72, 1.18, a),
  };
}

export function createSpatialGrid(ul: HTMLElement): () => void {
  if (reducedMotion() || typeof IntersectionObserver === 'undefined') return () => {};

  let items: Item[] = [];
  const byEl = new Map<Element, Item>();
  let raf = 0;
  let last = 0;
  let dead = false;
  let lastSy = scrollY;
  let vel = 0; // smoothed scroll speed in px/ms

  const liveIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = byEl.get(e.target);
      if (!it) continue;
      if (e.isIntersecting && !it.live) it.cur = null; // snap to the target pose, no swoop from a stale one
      it.live = e.isIntersecting;
      it.el.classList.toggle('live', e.isIntersecting); // will-change only while near the viewport
    }
    kick();
  }, { rootMargin: '30% 0px 30% 0px' });

  const seenIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const it = byEl.get(e.target);
      if (!it) continue;
      it.seen = true;
      it.el.classList.add('seen');
      seenIo.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });

  function refresh() {
    const kids = Array.from(ul.children) as HTMLElement[];
    const cols = Math.max(1, getComputedStyle(ul).gridTemplateColumns.split(' ').length);
    const prev = new Map(byEl);
    byEl.clear();
    liveIo.disconnect();
    seenIo.disconnect();
    items = kids.map((el, i) => {
      const col = i % cols;
      const c = cols > 1 ? (col / (cols - 1)) * 2 - 1 : 0;
      el.style.setProperty('--d', `${col * 90}ms`);
      el.style.setProperty('--cl', String(Math.max(0, -c)));
      el.style.setProperty('--cr', String(Math.max(0, c)));
      const old = prev.get(el);
      const it: Item = old ?? { el, c, live: false, seen: false, cur: null };
      it.c = c;
      byEl.set(el, it);
      liveIo.observe(el);
      if (!it.seen) seenIo.observe(el);
      return it;
    });
  }

  function frame(now: number) {
    raf = 0;
    if (dead) return;
    const dt = Math.min(64, now - last);
    last = now;
    const k = 1 - Math.exp(-dt / 100); // frame-rate independent easing, ~100ms response
    const vh = innerHeight;
    const sy = scrollY;
    const mobile = innerWidth < 768;
    let busy = false;
    vel += ((dt > 0 ? (sy - lastSy) / dt : 0) - vel) * (1 - Math.exp(-dt / 140));
    lastSy = sy;
    if (Math.abs(vel) > 0.02) busy = true; else vel = 0;

    // One vanishing point at the middle of the screen, so the whole grid bends around the viewer.
    ul.style.perspectiveOrigin = `50% ${Math.round(sy + vh / 2 - docTop(ul))}px`;

    for (const it of items) {
      // Cards skipped by a fast jump (anchor, back-navigation) never trigger the observer: reveal them
      // as soon as they are above the viewport, so scrolling back up never shows invisible cards.
      if (!it.seen && docTop(it.el) + it.el.offsetHeight < sy) { it.seen = true; it.el.classList.add('seen'); }
      if (!it.live) continue;
      const h = it.el.offsetHeight;
      const cy = docTop(it.el) + h / 2 - sy;
      const p = clamp((cy - vh / 2) / (vh / 2 + h / 2), -1.3, 1.3);
      const t = poseFor(p, it.c, vel, mobile);
      if (!it.cur) {
        it.cur = t;
      } else {
        for (const key of POSE_KEYS) {
          const d = t[key] - it.cur[key];
          it.cur[key] += d * k;
          if (Math.abs(d) > (key === 'o' || key === 's' ? 0.002 : 0.05)) busy = true;
        }
      }
      const c = it.cur;
      const st = it.el.style;
      st.transform = `translate3d(0,${c.ty.toFixed(2)}px,${c.tz.toFixed(2)}px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
      st.opacity = c.o.toFixed(3);
      // Scroll-linked sheen + grounding shadow use CSS variables, which force a style recalc per card per
      // frame. Measured ~2x frame time on a throttled phone, so phones keep them static.
      if (!mobile) {
        st.setProperty('--p', p.toFixed(3));
        st.setProperty('--a', Math.abs(p).toFixed(3));
      }
    }
    if (busy) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || dead) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; refresh(); kick(); });
  };

  const mo = new MutationObserver(() => { refresh(); kick(); });
  mo.observe(ul, { childList: true });

  refresh();
  ul.classList.add('sg-ready');
  void ul.offsetWidth; // flush so the entrance transition starts from the hidden state
  kick();

  // Safety net: never leave a card invisible if the observer misses it.
  const safety = setTimeout(() => { for (const it of items) if (it.live && !it.seen) { it.seen = true; it.el.classList.add('seen'); } }, 3500);

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  document.fonts?.ready.then(() => { if (!dead) { refresh(); kick(); } });

  return () => {
    dead = true;
    clearTimeout(safety);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(resizeRaf);
    removeEventListener('scroll', kick);
    removeEventListener('resize', onResize);
    liveIo.disconnect();
    seenIo.disconnect();
    mo.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* Coming / going reveal                                               */
/* ------------------------------------------------------------------ */

let revealIo: IntersectionObserver | null = null;

function getRevealIo(): IntersectionObserver {
  return (revealIo ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      if (e.isIntersecting) {
        el.classList.remove('rv-out', 'rv-gone');
      } else if (e.boundingClientRect.top < 0) {
        el.classList.add('rv-gone');   // left through the top: drifts up and fades
        el.classList.remove('rv-out');
      } else {
        el.classList.add('rv-out');    // still below the fold: waits low and faded
        el.classList.remove('rv-gone');
      }
    }
  }, { rootMargin: '0px 0px -10% 0px' }));
}

/** Elements fade/slide in when they arrive and out when they leave, in both scroll directions. */
export function observeReveal(el: HTMLElement, delay = 0): () => void {
  if (reducedMotion() || typeof IntersectionObserver === 'undefined') return () => {};
  const r = el.getBoundingClientRect();
  const inView = r.top < innerHeight * 0.9 && r.bottom > 0;
  el.classList.add('rv');
  if (delay) el.style.setProperty('--d', `${delay}ms`);
  if (!inView) el.classList.add('rv-out');
  const io = getRevealIo();
  io.observe(el);
  return () => io.unobserve(el);
}

/* ------------------------------------------------------------------ */
/* Pointer tilt (mouse only; touch devices skip it entirely)           */
/* ------------------------------------------------------------------ */

export function tiltMove(el: HTMLElement, e: PointerEvent, max = 6) {
  if (e.pointerType !== 'mouse') return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${(-(y - 0.5) * 2 * max).toFixed(2)}deg`);
  el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
}

export function tiltReset(el: HTMLElement) {
  for (const v of ['--rx', '--ry', '--mx', '--my']) el.style.removeProperty(v);
}

/* ------------------------------------------------------------------ */
/* Smooth scrolling                                                    */
/* ------------------------------------------------------------------ */

function insideScrollable(start: EventTarget | null): boolean {
  let n = start instanceof Element ? start : null;
  while (n && n !== document.body && n !== document.documentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    n = n.parentElement;
  }
  return false;
}

/**
 * Inertial mouse-wheel scrolling for desktop. Touch devices and reduced-motion users keep the
 * browser's native scrolling untouched (hijacking touch scroll is what makes sites lag on phones).
 * Keyboard, scrollbar drags, anchor jumps and router scrolls stay native; if one of them moves the
 * page, the smoother simply re-syncs to it.
 */
export function initSmoothScroll(enabled: () => boolean = () => true): () => void {
  if (reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};

  let target = scrollY;
  let cur = scrollY;
  let raf = 0;
  let last = 0;
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

  const step = (now: number) => {
    const dt = Math.min(48, now - last);
    last = now;
    cur += (target - cur) * (1 - Math.exp(-dt / 90));
    if (Math.abs(target - cur) < 0.4) cur = target;
    scrollTo({ top: cur, left: 0, behavior: 'instant' as ScrollBehavior });
    raf = cur === target ? 0 : requestAnimationFrame(step);
  };

  const onWheel = (e: WheelEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || !enabled()) return; // ctrl+wheel is zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (insideScrollable(e.target)) return;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 32;
    else if (e.deltaMode === 2) dy *= innerHeight;
    e.preventDefault();
    if (!raf) { target = cur = scrollY; last = performance.now(); }
    target = clamp(target + dy, 0, maxY());
    if (!raf) raf = requestAnimationFrame(step);
  };

  const onScroll = () => {
    if (!raf) { target = cur = scrollY; return; }
    if (Math.abs(scrollY - cur) > 3) { // someone else moved the page (keyboard, anchor, router)
      cancelAnimationFrame(raf);
      raf = 0;
      target = cur = scrollY;
    }
  };

  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('scroll', onScroll, { passive: true });
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('wheel', onWheel);
    removeEventListener('scroll', onScroll);
  };
}
