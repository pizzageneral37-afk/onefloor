(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, FINE = matchMedia('(pointer:fine)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const prog = el => { const r = el.getBoundingClientRect(), vh = innerHeight; return Math.min(1, Math.max(0, (vh * .75 - r.top) / Math.max(1, r.height - vh * .35))); };
  const chaos = $('.chaos'), pain = $('#pain'), what = $('#what'), how = $('#how');
  const tiles = $$('.meet .tile'), cnt = $('.meet .cnt'), steps = $$('#how .steps li'), bar = $('#how .prog');
  // FAQ smooth accordion
  $$('.qs details').forEach(d => {
    const p = d.querySelector('p'); const w = document.createElement('div'); p.before(w); w.appendChild(p);
    d.querySelector('summary').addEventListener('click', e => {
      if (RM) return; e.preventDefault();
      if (d.open) { w.style.height = w.scrollHeight + 'px'; requestAnimationFrame(() => w.style.height = '0px'); setTimeout(() => { d.open = false; w.style.height = ''; }, 350); }
      else { d.open = true; const h = w.scrollHeight; w.style.height = '0px'; requestAnimationFrame(() => w.style.height = h + 'px'); setTimeout(() => w.style.height = '', 360); }
    });
  });
  // logo row reveal
  const wm = $('.wm'); if (wm && !RM) { wm.classList.add('rise'); new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { wm.classList.add('in'); o.disconnect(); } }), { threshold: .4 }).observe(wm); }
  if (RM) { tiles.forEach(t => t.classList.add('in')); steps.forEach(s => s.classList.add('on')); return; }
  // scroll-driven story
  let talking = -1, tick = 0;
  const frame = () => {
    if (chaos) chaos.style.setProperty('--p', Math.min(1, prog(pain) * 1.4).toFixed(3));
    if (what) { const p = prog(what), n = Math.min(tiles.length, Math.floor(p * 9)); tiles.forEach((t, i) => t.classList.toggle('in', i < Math.max(1, n))); cnt.textContent = Math.max(1, n) + ' in call'; tiles[4].classList.toggle('up', p > .78); what.dataset.n = n; }
    if (how) { const p = prog(how); bar.style.setProperty('--p', p.toFixed(3)); steps.forEach((s, i) => s.classList.toggle('on', p > i * .3 + .05)); }
  };
  let q = 0; const req = () => { if (!q) q = requestAnimationFrame(() => { q = 0; frame(); }); };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); req();
  // rotating speaker among joined tiles
  setInterval(() => { const live = tiles.filter((t, i) => i > 0 && t.classList.contains('in') && !t.classList.contains('up')); tiles.forEach(t => t.classList.remove('talk')); if (live.length) live[tick++ % live.length].classList.add('talk'); }, 1600);
  if (!FINE) return;
  // cursor light
  const g = $('.glow'); g.classList.add('on');
  addEventListener('pointermove', e => { g.style.setProperty('--mx', e.clientX + 'px'); g.style.setProperty('--my', e.clientY + 'px'); }, { passive: true });
  // magnetic buttons
  $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
})();
