(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const MOBILE = innerWidth < 760;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- waitlist (unchanged contract) ---------- */
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
    f.innerHTML = '<p class="ok" role="status">Waitlist opens soon. Thanks for your interest, check back shortly.</p>';
  }));
  const v = $('#demo'), src = v && v.dataset.videoSrc;
  if (src) v.innerHTML = /\.(mp4|webm)(\?|$)/.test(src) ? `<video src="${src}" controls playsinline preload="metadata"></video>` : `<iframe src="${src}" title="${document.documentElement.dataset.brand} demo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;

  /* ---------- data (illustrative) ---------- */
  const A = [
    { n: 'Mara', c: '#b9a6ff', s: ['Launching campaign', 'Assigning 3 tasks', 'Updating the plan', 'Checking deadlines'] },
    { n: 'Dev', c: '#5fe0c4', s: ['Fixing signup form', 'Running tests', 'Deploying preview', 'Reviewing a change'] },
    { n: 'Rui', c: '#f6c56c', s: ['Reading 14 sources', 'Comparing markets', 'Summarizing findings', 'Checking a claim'] },
    { n: 'Sol', c: '#ff94b0', s: ['Writing email', 'Drafting landing copy', 'Reading draft aloud', 'Editing subject lines'] },
    { n: 'Kit', c: '#78adff', s: ['Waiting for your approval', 'Building a chart', 'Pulling last month', 'Cleaning the data'] },
    { n: 'Ari', c: '#c8e47a', s: ['Triaging inbox', 'Replying to a customer', 'Tagging 9 tickets', 'Escalating one issue'] }
  ];
  const LOG = [
    ['Mara', 'assigned "pricing page" to Sol'], ['Dev', 'pushed fix for the signup form'], ['Rui', 'found 3 new sources on onboarding'],
    ['Sol', 'drafted 2 subject lines'], ['Kit', 'raised a hand: budget question'], ['Ari', 'closed 4 support tickets'],
    ['Mara', 'moved launch checklist to 80%'], ['Dev', 'preview deploy is ready'], ['Sol', 'is reading the email draft aloud'],
    ['Rui', 'flagged one claim as unverified'], ['Kit', 'chart for last month is ready'], ['Ari', 'escalated one refund to you']
  ];
  const col = n => (A.find(a => a.n === n) || {}).c || '#fff';
  const now = () => { const d = new Date(); return d.toTimeString().slice(0, 8); };

  /* ---------- scramble hero ---------- */
  const h1 = $('[data-scramble]');
  if (h1 && !RM) {
    const final = h1.textContent, chars = '<>/[]{}=+*#01';
    const t0 = performance.now(), DUR = 1300;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / DUR);
      if (p >= 1) { h1.textContent = final; return; }
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i], k = i / final.length;
        out += (ch === ' ' || k < p) ? ch : `<span class="sc">${chars[(Math.random() * chars.length) | 0]}</span>`;
      }
      h1.innerHTML = out; setTimeout(tick, 40);
    };
    tick(); setTimeout(() => { h1.textContent = final; }, DUR + 400);
  }

  /* ---------- terminal ticker ---------- */
  const tk = $('#ticker');
  let li = 0;
  const push = () => {
    const [n, t] = LOG[li++ % LOG.length];
    const el = document.createElement('li');
    el.innerHTML = `<span class="t">${now()}</span><b style="color:${col(n)}">${n}</b> ${t}`;
    tk.appendChild(el); while (tk.children.length > 5) tk.firstChild.remove();
  };
  for (let i = 0; i < 4; i++) push();
  if (!RM) setInterval(push, 1900);

  /* ---------- tiles: status cycle + talking ---------- */
  const tiles = $$('.tile');
  const kit = tiles[4], toast = $('#toast');
  const stateIdx = A.map(() => 0);
  const setStatus = (i, s) => { const t = tiles[i].querySelector('.st-t'); t.textContent = s; t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); };
  let raised = false;
  const raise = () => { raised = true; kit.classList.add('raised'); setStatus(4, 'Waiting for your approval'); toast.classList.remove('reply'); $('#toast').innerHTML = '<b>Kit</b> raised a hand: <span>Budget looks 12% over. Approve or trim?</span><button type="button" class="ans" id="ans">Answer</button>'; toast.classList.add('on'); };
  toast.addEventListener('click', e => {
    if (!e.target.closest('.ans')) return;
    raised = false; kit.classList.remove('raised');
    toast.classList.add('reply');
    toast.innerHTML = '<b>You</b> <span>Trim it to plan. Thanks, Kit.</span>';
    setTimeout(() => { toast.innerHTML = '<b>Kit</b> <span>On it. Trimming two line items now.</span>'; setStatus(4, 'Trimming budget'); kit.classList.add('talk'); setTimeout(() => kit.classList.remove('talk'), 2400); }, 1100);
    if (!RM) setTimeout(raise, 9000);
  });
  let talker = 0;
  const cycle = () => {
    tiles.forEach(t => t !== kit || !raised ? t.classList.remove('talk') : 0);
    talker = (talker + 1 + ((Math.random() * 3) | 0)) % 6; if (talker === 4 && raised) talker = 0;
    tiles[talker].classList.add('talk');
    const i = (Math.random() * 6) | 0; if (!(i === 4 && raised)) { stateIdx[i] = (stateIdx[i] + 1) % A[i].s.length; setStatus(i, A[i].s[stateIdx[i]]); }
  };
  tiles[0].classList.add('talk');
  if (RM) { raise(); } else { setInterval(cycle, 2200); setTimeout(raise, 2600); }

  /* ---------- demo widget ---------- */
  const FEED = [
    ['Stand-up done, 6 agents present', 'Assigned pricing page to Sol', 'Launch checklist at 80%', 'Launching campaign'],
    ['Reproduced the signup bug', 'Fix written, tests passing', 'Preview deploy is ready', 'Fixing signup form'],
    ['Collected 14 sources', 'Two disagree on market size', 'Flagged one claim as unverified', 'Reading 14 sources'],
    ['Drafted welcome email', 'Wrote 2 subject line options', 'Reading the draft aloud', 'Writing email'],
    ['Pulled last month\u2019s numbers', 'Built the spend chart', 'Budget is 12% over plan', 'Waiting for your approval'],
    ['Inbox triaged, 9 tagged', 'Replied to 4 customers', 'One refund needs you', 'Triaging inbox']
  ];
  const dwLog = $('#dw-log'), dwAsk = $('#dw-ask');
  const showAgent = i => {
    $$('.dw-a').forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    tiles.forEach((t, j) => t.classList.toggle('sel', i === j));
    $('#dw-name').textContent = A[i].n; $('#dw-name').style.color = A[i].c; $('#dw-st').textContent = FEED[i][3];
    const base = Date.now() - 4 * 60e3;
    dwLog.innerHTML = FEED[i].slice(0, 3).map((t, k) => `<li style="animation-delay:${k * 120}ms"><span class="t">${new Date(base + k * 80e3).toTimeString().slice(0, 5)}</span>${t}</li>`).join('');
    const asks = { 4: ['Budget looks 12% over. Approve or trim?', 'Answer: trim it'], 5: ['Refund request over the usual limit. Approve?', 'Answer: approve'] };
    if (asks[i]) { dwAsk.hidden = false; $('#dw-q').textContent = '✋ ' + asks[i][0]; $('#dw-ans').textContent = asks[i][1]; $('#dw-ans').disabled = false; } else dwAsk.hidden = true;
  };
  $$('.dw-a').forEach(b => b.addEventListener('click', () => showAgent(+b.dataset.i)));
  tiles.forEach((t, i) => t.addEventListener('click', () => { showAgent(i); if (innerWidth < 900) $('#demo-w').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }));
  $('#dw-ans').addEventListener('click', e => {
    e.currentTarget.disabled = true;
    const add = (t, cls) => { const l = document.createElement('li'); if (cls) l.className = cls; l.innerHTML = `<span class="t">${now().slice(0, 5)}</span>${t}`; dwLog.appendChild(l); };
    add('You: ' + e.currentTarget.textContent.replace('Answer: ', '') + '.', 'me');
    setTimeout(() => { add('Got it. Working on it now.'); dwAsk.hidden = true; $('#dw-st').textContent = 'Working'; }, 900);
  });
  showAgent(0); tiles[0].classList.remove('sel');

  /* ---------- reveals ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
    const caps = ['Connect your agents', 'Give each a face, voice and desk', 'Open the office in a live meeting', 'Run the day'];
    const vis = $('#vis'), vcap = $('#vcap');
    const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const s = +e.target.dataset.step; $$('.step').forEach(x => x.classList.toggle('act', x === e.target)); vis.dataset.s = s; vcap.textContent = caps[s]; } }), { rootMargin: '-45% 0px -45% 0px' });
    $$('.step').forEach(s => so.observe(s));
    $('.step').classList.add('act');
  } else document.documentElement.classList.add('no-js');

  /* ---------- pointer effects (desktop only) ---------- */
  if (FINE && !RM) {
    const rig = $('#rig'), stage = $('#stage'), root = document.documentElement.style;
    let mx = 0, my = 0, raf = 0;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0; root.setProperty('--mx', mx + 'px'); root.setProperty('--my', my + 'px');
        const r = stage.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) {
          const x = (mx - (r.left + r.width / 2)) / innerWidth, y = (my - (r.top + r.height / 2)) / innerHeight;
          rig.style.transform = `rotateY(${(-8 + x * 14).toFixed(2)}deg) rotateX(${(4 - y * 10).toFixed(2)}deg)`;
        }
      });
    }, { passive: true });
    $('#rig').style.transform = 'rotateY(-8deg) rotateX(4deg)';
    $$('.spot').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--x', e.clientX - r.left + 'px'); c.style.setProperty('--y', e.clientY - r.top + 'px'); }));
    $$('.mag').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transition = 'transform .4s cubic-bezier(.2,1.4,.4,1)'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 400); });
    });
  }

  /* ---------- canvas neural mesh ---------- */
  const cv = $('#bg'), ctx = cv.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
  let W, H, P = [], pm = { x: -999, y: -999 };
  const N = MOBILE ? 34 : 90, LINK = MOBILE ? 110 : 150;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size(); addEventListener('resize', size);
  const cols = ['185,166,255', '111,227,255', '246,197,108'];
  for (let i = 0; i < N; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .6, c: cols[i % 7 === 0 ? 2 : i % 2], ph: Math.random() * 6 });
  addEventListener('pointermove', e => { pm.x = e.clientX; pm.y = e.clientY; }, { passive: true });
  let pulses = [];
  const draw = t => {
    ctx.clearRect(0, 0, W, H);
    for (const p of P) {
      if (!RM) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = p.x - pm.x, dy = p.y - pm.y, d = dx * dx + dy * dy; if (d < 22000) { p.x += dx / 90; p.y += dy / 90; } }
    }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = P[i], b = P[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if (d < LINK) { ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK) * .22})`; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    for (const p of P) { const tw = .55 + .45 * Math.sin(t / 900 + p.ph); ctx.fillStyle = `rgba(${p.c},${.5 * tw + .2})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    if (!RM && Math.random() < .04) { const a = P[(Math.random() * N) | 0]; let best = null, bd = LINK; for (const b of P) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (b !== a && d < bd) { bd = d; best = b; } } if (best) pulses.push({ a, b: best, t: 0 }); }
    pulses = pulses.filter(s => (s.t += .025) < 1);
    for (const s of pulses) { const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t; ctx.fillStyle = `rgba(${s.a.c},.95)`; ctx.shadowColor = `rgba(${s.a.c},1)`; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    if (!RM && !document.hidden) requestAnimationFrame(draw);
  };
  const start = () => requestAnimationFrame(draw);
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 300);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !RM) requestAnimationFrame(draw); });
})();
