(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches && innerWidth > 900;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const bus = window.VO = window.VO || new EventTarget();
  // = $$('.join-cap li'); bus.addEventListener('vo:join', e => { const p = e.detail; jc.forEach(li => { const d = +li.dataset.p; li.classList.toggle('on', p >= d && p < 5); li.classList.toggle('now', d === (p >= 4 ? 4 : p >= 3 ? 3 : p >= 2 ? 2 : 0) && p < 5); }); }); });
  const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
  const AG = [['Mara', 'var(--a0)', 'Ops'], ['Dev', 'var(--a1)', 'Eng'], ['Rui', 'var(--a2)', 'Research'], ['Sol', 'var(--a3)', 'Copy'], ['Kit', 'var(--a4)', 'Analytics'], ['Nova', 'var(--a5)', 'Support']];

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
    f.innerHTML = '<p class="ok" role="status">Waitlist opens soon. Thanks for your interest, check back shortly.</p>';
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

  /* ---------- Talk to your office (scripted) ---------- */
  const list = $('#c-agents'), log = $('#c-log'), ask = $('#c-ask');
  list.innerHTML = AG.map(([n, c, r], i) => `<li class="idle" data-i="${i}" style="--c:${c}"><span class="c-av">${n[0]}</span><span class="c-nm">${n} <small>${r} desk · idle</small><span class="c-wv">${'<i></i>'.repeat(12)}</span></span><span class="c-bar"><i></i></span></li>`).join('');
  const rows = $$('li', list);
  const now = () => new Date().toTimeString().slice(0, 5);
  const line = (who, txt, cls = '') => { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = `<span class="t">${now()}</span>` + (who != null ? `<b style="color:${AG[who][1]}">${AG[who][0]}</b> ` : '') + txt; log.appendChild(li); while (log.children.length > 14) log.firstChild.remove(); log.scrollTop = 1e6; };
  const sleep = ms => new Promise(r => setTimeout(r, RM ? ms / 3 : ms));
  const speaking = new Set();
  const say = (i, ms = 1400) => { rows[i].classList.add('spk'); speaking.add(i); emit('vo:speak', { i, on: true }); setTimeout(() => { rows[i].classList.remove('spk'); speaking.delete(i); emit('vo:speak', { i, on: false }); }, ms); };
  const plan = t => {
    const s = t.toLowerCase();
    if (/bug|fix|signup|error|broken/.test(s)) return [[1, 'Reproduce and fix the bug'], [4, 'Count affected users'], [3, 'Draft the customer notice'], [5, 'Reply to open tickets']];
    if (/research|competitor|pricing|market|compare/.test(s)) return [[2, 'Collect public pricing pages'], [4, 'Build a comparison table'], [3, 'Write a one-page summary']];
    if (/launch|promo|campaign|sale|email/.test(s)) return [[3, 'Write the promo email and 3 posts'], [1, 'Build the promo banner'], [4, 'Set the budget and tracking'], [5, 'Prep support replies']];
    return [[2, 'Gather the context'], [1, 'Build what is needed'], [3, 'Draft the write-up'], [4, 'Check the numbers']];
  };
  let running = false, answer = null;
  const setRow = (i, txt, p) => { rows[i].classList.toggle('idle', p == null); $('small', rows[i]).textContent = `${AG[i][2]} desk · ${txt}`; $('.c-bar i', rows[i]).style.width = (p || 0) + '%'; };
  const run = async task => {
    if (running) return; running = true;
    rows.forEach((_, i) => setRow(i, 'idle', null));
    emit('vo:task', { task });
    line(null, `You: “${task}”`, 'me');
    await sleep(700); setRow(0, 'splitting the task', 20); say(0); line(0, 'Got it. Splitting this across the room.');
    const p = plan(task); await sleep(1100);
    for (const [i, sub] of p) { setRow(i, sub.toLowerCase(), 6); line(0, `→ <b style="color:${AG[i][1]}">${AG[i][0]}</b>: ${sub}`); emit('vo:assign', { from: 0, to: i }); await sleep(420); }
    setRow(0, 'tracking progress', 40);
    const prog = Object.fromEntries(p.map(([i]) => [i, 6]));
    const notes = { 1: ['Found it. Writing the fix.', 'Tests pass. Preview is ready.'], 2: ['Reading 14 sources.', 'Two sources disagree. Flagging it.'], 3: ['First draft is ready. Reading it aloud.', 'Tightened the subject line.'], 4: ['Pulled last month.', 'Numbers are in.'], 5: ['Queued 6 template replies.', 'Inbox is clear.'] };
    let asked = false;
    while (Object.values(prog).some(v => v < 100)) {
      await sleep(900);
      const live = p.filter(([i]) => prog[i] < 100 && !(i === 4 && asked && answer === null));
      if (!live.length) continue;
      const [i] = live[(Math.random() * live.length) | 0];
      prog[i] = Math.min(100, prog[i] + 22 + Math.random() * 20);
      if (i === 4 && !asked && prog[i] > 40) {
        asked = true; answer = null; say(4, 2000); line(4, '✋ raised a hand: budget looks 12% over. Approve or trim?');
        $('#c-q').textContent = '✋ Kit: Budget looks 12% over. Approve or trim?'; ask.hidden = false; emit('vo:hand', { on: true }); setRow(4, 'waiting for your approval', prog[4]);
        continue;
      }
      const n = notes[i]; const msg = prog[i] >= 100 ? n[1] : n[0];
      setRow(i, prog[i] >= 100 ? 'done' : 'working', prog[i]); say(i); line(i, msg + (prog[i] >= 100 ? ' ✓' : ''));
    }
    await sleep(700); setRow(0, 'done', 100); say(0, 2000);
    line(0, `Done. ${p.length} desks finished “${task}”. Summary is on your second screen.`, 'done');
    running = false;
  };
  const decide = a => { answer = a; ask.hidden = true; emit('vo:hand', { on: false }); line(null, a ? 'You: Approved.' : 'You: Trim it to plan.', 'me'); setTimeout(() => { say(4); line(4, a ? 'Approved. Continuing.' : 'Trimming two line items now.'); }, 600); };
  $('#c-yes').onclick = () => decide(true); $('#c-no').onclick = () => decide(false);
  const inp = $('#task');
  $('#talk-form').addEventListener('submit', e => { e.preventDefault(); const t = inp.value.trim() || inp.placeholder; inp.value = ''; run(t); });
  $$('.chip').forEach(c => c.addEventListener('click', () => { if (!running) { inp.value = c.textContent; $('#talk-form').requestSubmit(); } }));
  window.__voRun = run;
})();
