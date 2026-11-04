(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches && innerWidth > 900;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const bus = window.VO = window.VO || new EventTarget();
  // = $$('.join-cap li'); bus.addEventListener('vo:join', e => { const p = e.detail; jc.forEach(li => { const d = +li.dataset.p; li.classList.toggle('on', p >= d && p < 5); li.classList.toggle('now', d === (p >= 4 ? 4 : p >= 3 ? 3 : p >= 2 ? 2 : 0) && p < 5); }); }); });
  const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
  const AG = [['Shuki', 'var(--a0)', 'Ops'], ['Dev', 'var(--a1)', 'Eng'], ['Rui', 'var(--a2)', 'Research'], ['Sol', 'var(--a3)', 'Copy'], ['Kit', 'var(--a4)', 'Analytics'], ['Nova', 'var(--a5)', 'Support']];

  /* ---------- waitlist ---------- */
  const q = new URLSearchParams(location.search);
  const meta = { utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '', referrer: document.referrer || '' };
  const re = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
  $$('[data-form]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = f.querySelector('.msg'), btn = f.querySelector('button');
    const d = Object.fromEntries(new FormData(f));
    f.classList.remove('err');
    if (!d.name.trim()) { msg.textContent = 'Please add your name.'; f.classList.add('err'); return f.name.focus(); }
    if (!re.test(d.email.trim())) { msg.textContent = "That email doesn't look right."; f.classList.add('err'); return f.email.focus(); }
    btn.disabled = true; msg.textContent = 'Saving your spot…';
    try {
      const r = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, ...meta }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Something went wrong.');
      f.innerHTML = '<p class="ok" role="status"><span aria-hidden="true">✓</span> ' + (j.duplicate ? "You're already on the list. We'll be in touch." : "You're on the list. We'll email you when your seat opens.") + '</p>';
    } catch (x) { msg.textContent = x.message; f.classList.add('err'); btn.disabled = false; }
  }));
  const v = $('#demo'), src = v && v.dataset.videoSrc;
  if (src) v.hidden = false;
  if (src) v.innerHTML = /\.(mp4|webm)(\?|$)/.test(src) ? `<video src="${src}" controls playsinline preload="metadata"></video>` : `<iframe src="${src}" title="${document.documentElement.dataset.brand} demo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;

  /* ---------- gentle scroll + reveals ---------- */
  if (!RM && window.Lenis) {
    const lenis = new Lenis({ lerp: .12, smoothWheel: true }); window.__lenis = lenis;
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.4 }); } }));
  }
  const rv = $$('.hero-c > *, .panel > *');
  if (!RM && 'IntersectionObserver' in window) {
    rv.forEach(el => el.classList.add('rv'));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  }

})();
