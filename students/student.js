/* Student Pages template.
   Every student page (caidenlee.com/<name>/) loads this file. It reads /students/<name>.json
   and builds the page from it. To add a student or a session, edit data files only.
   See /students/_sample.json for the data format. */
(function () {
  'use strict';

  var COACHING_URL = 'https://caidenlee.com/#coaching';
  var TAB_COLORS = ['var(--cube-b)', 'var(--cube-g)', 'var(--cube-y)', 'var(--cube-o)', 'var(--cube-r)'];
  var ICON = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    fix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>',
    drill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>'
  };

  // ---------- helpers ----------
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(html) { var s = document.createElement('span'); s.innerHTML = html; return s.firstChild; } // static icons only
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: checks just won't persist */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function safeHref(u) {
    if (typeof u !== 'string') return null;
    u = u.trim();
    if (/^\/(?!\/)/.test(u)) return u;
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; }
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function fmtDate(s) {
    var d = parseDate(s);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : String(s || '');
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function num(v) { var m = /\d+(?:\.\d+)?/.exec(String(v == null ? '' : v)); return m ? parseFloat(m[0]) : NaN; }
  // Confetti burst in cube colors (same as the homepage)
  var CUBE_COLORS = ['#00c853', '#ff3b30', '#2979ff', '#ff9100', '#ffd600', '#f8f8f8'];
  function burstAt(el, count) {
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = document.getElementById('confetti-layer');
    if (!layer) { layer = h('div'); layer.id = 'confetti-layer'; document.body.append(layer); }
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var k = 0; k < (count || 26); k++) {
      var c = document.createElement('i'), ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 130;
      c.style.left = cx + 'px'; c.style.top = cy + 'px';
      c.style.background = CUBE_COLORS[Math.floor(Math.random() * CUBE_COLORS.length)];
      c.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      c.style.setProperty('--dy', (Math.sin(ang) * dist - 40) + 'px');
      c.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      layer.append(c);
      setTimeout(function (x) { x.remove(); }.bind(null, c), 1000);
    }
  }
  function asItem(x) { return typeof x === 'string' ? { text: x } : (x && typeof x === 'object' ? x : { text: String(x) }); }
  function list(x) { return Array.isArray(x) ? x : []; }
  // Data files may contain full-line // comments (see _sample.json). Strip them before parsing.
  function parseData(txt) {
    return JSON.parse(txt.split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n'));
  }

  // ---------- which student ----------
  // The page's folder name picks the data file: caidenlee.com/adamnasser -> /students/adamnasser.json
  var parts = location.pathname.split('/').filter(Boolean).filter(function (x) { return !/^index\.html?$/i.test(x); });
  var slug = parts.length ? decodeURIComponent(parts[parts.length - 1]).toLowerCase().replace(/\.html$/, '') : '';
  if (slug === 'students') slug = '';
  if (!/^[a-z0-9-]+$/.test(slug)) slug = '';
  var KEY = 'cl-student:' + slug + ':';

  // ---------- practice log (saved on this device) ----------
  // log = { v: 1, days: { 'YYYY-MM-DD': { checks: { '<session>|<tab>-<drill>': 'Drill text' }, minutes, avg, note, updated } } }
  var log = (function () { var l = store.get(KEY + 'log'); return (l && l.days && typeof l.days === 'object') ? l : { v: 1, days: {} }; })();
  var selDay = null;
  function saveLog() { store.set(KEY + 'log', log); }
  function dayRec(d, create) {
    var r = log.days[d];
    if (!r && create) r = log.days[d] = { checks: {} };
    if (r && (!r.checks || typeof r.checks !== 'object')) r.checks = {};
    return r || null;
  }
  function touch(d) {
    var r = log.days[d];
    if (r) {
      r.updated = Date.now();
      if (!Object.keys(r.checks || {}).length && !(+r.minutes > 0) && !(+r.avg > 0) && !String(r.note || '').trim()) delete log.days[d];
    }
    saveLog();
  }
  function practiced(r) { return !!r && (Object.keys(r.checks || {}).length > 0 || +r.minutes > 0 || +r.avg > 0); }
  function addDays(ymd, n) { var d = parseDate(ymd); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function shortDate(ymd) { var d = parseDate(ymd); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ymd; }
  function dayName(ymd) {
    if (ymd === today()) return 'Today';
    if (ymd === addDays(today(), -1)) return 'Yesterday';
    var d = parseDate(ymd); return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function streak() {
    var d = today(), n = 0;
    if (!practiced(log.days[d])) d = addDays(d, -1); // today not logged yet keeps yesterday's streak alive
    while (practiced(log.days[d])) { n++; d = addDays(d, -1); }
    return n;
  }
  function weekCount() { // Monday to Sunday
    var t = parseDate(today()), back = (t.getDay() + 6) % 7, n = 0;
    for (var k = 0; k <= back; k++) if (practiced(log.days[addDays(today(), -k)])) n++;
    return n;
  }
  function fmtMins(m) { m = Math.round(m || 0); if (m < 60) return m + 'm'; var hh = Math.floor(m / 60), mm = m % 60; return hh + 'h' + (mm ? ' ' + mm + 'm' : ''); }
  function summary(r) {
    var parts = [], n = Object.keys(r.checks || {}).length;
    if (n) parts.push(n + (n === 1 ? ' drill' : ' drills'));
    if (+r.minutes > 0) parts.push(fmtMins(+r.minutes));
    if (+r.avg > 0) parts.push(r.avg + ' avg');
    return parts.join(' · ') || 'Notes only';
  }
  function copy(text, done) {
    var ok = function () { done('Copied. Paste it in a text to Caiden.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { done('Couldn’t copy on this browser.'); });
    else done('Couldn’t copy on this browser.');
  }
  // Older version kept one day of checks per session. Move it into the log.
  function migrate() {
    var moved = false;
    sessions.forEach(function (s) {
      var old = store.get(KEY + s.id);
      if (!old || !old.day || !old.checks) return;
      var r = dayRec(old.day, true);
      Object.keys(old.checks).forEach(function (k) {
        var m = /^(\d+)-(\d+)$/.exec(k); if (!m || !old.checks[k]) return;
        var t = list(s.tabs)[+m[1]], it = t && list(t.practice)[+m[2]];
        r.checks[s.id + '|' + k] = it ? (asItem(it).text || 'Drill') : 'Drill';
      });
      r.updated = Date.now(); store.del(KEY + s.id); moved = true;
    });
    if (moved) saveLog();
  }

  // ---------- shell ----------
  var root = document.getElementById('root');
  var nav = h('nav');
  var back = h('a', 'nav-back', '← Home'); back.href = '/';
  var title = h('div', 'nav-title'); title.append('Caiden’s ', h('span', null, 'Coaching'));
  nav.append(back, title);
  var main = h('main');
  var foot = h('footer'); foot.append('© ' + new Date().getFullYear() + ' ');
  var fl = h('a', null, 'Caiden Lee'); fl.href = '/'; foot.append(fl);
  root.append(nav, main, foot);
  window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 10); }, { passive: true });

  function message(head, body) {
    main.replaceChildren();
    var m = h('div', 'sp-msg'); m.append(h('h1', null, head), h('p', null, body));
    main.append(m);
  }

  if (!slug) { message('Page not found', 'Check the link from your coach.'); return; }

  var data = null, sessions = [];

  fetch('/students/' + slug + '.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('missing'); return r.text(); })
    .then(function (t) {
      data = parseData(t);
      sessions = list(data.sessions).filter(function (s) { return s && s.date; })
        .slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      sessions.forEach(function (s) { if (!s.id) s.id = s.date; });
      migrate();
      if (!sessions.length) { message('No notes yet', 'Your first session notes will show up here.'); return; }
      document.title = (data.name || 'Student') + ' | Coaching Notes';
      window.addEventListener('hashchange', render);
      window.addEventListener('popstate', render);
      var shownDay = today();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && today() !== shownDay) { if (selDay === shownDay) selDay = today(); shownDay = today(); render(); }
      });
      render();
    })
    .catch(function () { message('Page not found', 'This student page isn’t set up yet. Check the link from your coach.'); });

  function currentSession() {
    var id = decodeURIComponent(location.hash.replace(/^#/, ''));
    for (var k = 0; k < sessions.length; k++) if (sessions[k].id === id) return sessions[k];
    return sessions[0];
  }

  // ---------- render ----------
  function render() {
    var s = currentSession();
    var latest = s === sessions[0];
    main.replaceChildren();
    var d = 0;
    function rv(el) { el.classList.add('rv'); el.style.setProperty('--d', (d++ * 0.06) + 's'); return el; }

    // header
    var head = rv(h('header', 'sp-head'));
    head.append(h('h1', 'sp-name', data.name || 'Student'));
    var meta = h('div', 'sp-meta');
    var c1 = h('span', 'sp-chip'); c1.append(svg(ICON.cal), h('b', null, fmtDate(s.date)));
    meta.append(c1); head.append(meta); main.append(head);

    if (!latest) {
      var past = rv(h('div', 'sp-past'));
      past.append(h('span', null, 'You’re viewing a past session.'));
      var lb = h('button', 'btn btn-secondary', 'Back to latest'); lb.type = 'button';
      lb.addEventListener('click', function () { goSession(sessions[0].id); });
      past.append(lb); main.append(past);
    }

    // goal bar: built from the "Current Average" and "Goal" stats when both have numbers
    var stats = list(s.stats);
    var avgStat = stats.filter(function (x) { return x && /average/i.test(x.label || ''); })[0];
    var goalStat = stats.filter(function (x) { return x && /goal/i.test(x.label || ''); })[0];
    var cur = avgStat ? num(avgStat.value) : NaN, tgt = goalStat ? num(goalStat.value) : NaN;
    if (cur > 0 && tgt > 0) {
      stats = stats.filter(function (x) { return x !== avgStat && x !== goalStat; });
      var reached = cur <= tgt;
      var pct = Math.min(100, Math.round(100 * tgt / cur));
      var gb = rv(h('section', 'sp-goal' + (reached ? ' reached' : ''))); gb.setAttribute('aria-label', 'Progress to goal');
      var top = h('div', 'sp-goal-top');
      var a = h('div', 'sp-goal-now'); a.append(h('span', 'sp-goal-k', avgStat.label || 'Average'), h('span', 'sp-goal-v', String(avgStat.value)));
      var b = h('div', 'sp-goal-to'); b.append(h('span', 'sp-goal-k', 'Goal'), h('span', 'sp-goal-v', String(goalStat.value)));
      top.append(a, h('span', 'sp-goal-arrow', '→'), b);
      var track = h('div', 'sp-goal-track'); var fill = h('i'); track.append(fill);
      track.setAttribute('role', 'progressbar'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', String(pct));
      var foot = h('div', 'sp-goal-foot');
      foot.append(h('b', null, reached ? 'Goal reached!' : (Math.round((cur - tgt) * 100) / 100) + 's to go'), h('span', null, pct + '% of goal speed'));
      gb.append(top, track, foot); main.append(gb);
      setTimeout(function () { fill.style.width = pct + '%'; }, 350);
    }

    // stats
    if (stats.length) {
      var sg = rv(h('section', 'sp-stats')); sg.setAttribute('aria-label', 'Stats');
      stats.forEach(function (st) {
        st = st || {};
        var card = h('div', 'sp-stat' + (st.wide ? ' wide' : '') + (/goal/i.test(st.label || '') ? ' goal' : ''));
        card.append(h('div', 'sp-stat-label', st.label || ''), h('div', 'sp-stat-value', st.value == null ? '' : String(st.value)));
        if (st.sub) card.append(h('div', 'sp-stat-sub', st.sub));
        sg.append(card);
      });
      main.append(sg);
    }

    // big theme
    if (s.theme && (s.theme.title || list(s.theme.points).length)) {
      var th = rv(h('section', 'sp-theme'));
      th.append(h('div', 'section-label', 'Big Theme'), h('div', 'sp-theme-title', s.theme.title || ''));
      var pts = h('ul', 'sp-theme-points');
      list(s.theme.points).forEach(function (p) { pts.append(h('li', null, p)); });
      th.append(pts); main.append(th);
    }

    // ================= PRACTICE LOG =================
    // Every day has its own record: which drills were done, minutes, average and notes.
    var tabs = list(s.tabs);
    var drills = [];
    tabs.forEach(function (t, ti) {
      list(t.practice).forEach(function (raw, pi) { drills.push({ id: s.id + '|' + ti + '-' + pi, ti: ti, pi: pi, item: asItem(raw) }); });
    });
    var total = drills.length;
    if (!selDay || selDay > today()) selDay = today();
    var barFill, barNote, resetBtn, dayBar, logHost, histHost, drawTab = function () {};

    function sessionDone(rec) { var n = 0; drills.forEach(function (x) { if (rec && rec.checks[x.id]) n++; }); return n; }
    function updateProgress() {
      var n = sessionDone(dayRec(selDay)), isToday = selDay === today();
      if (barFill) barFill.style.width = total ? (100 * n / total) + '%' : '0';
      if (barNote) {
        barNote.parentNode.classList.toggle('all', n === total && total > 0);
        barNote.textContent = n === total && total ? (isToday ? 'All done today. Nice work!' : 'All drills done this day.') : n + ' of ' + total + ' done' + (isToday ? ' today' : '');
      }
      if (resetBtn) resetBtn.textContent = isToday ? 'Reset for today' : 'Clear this day';
    }
    function setDay(d, scroll) {
      if (!d || d > today()) return;
      selDay = d; drawDayBar(); drawTab(); updateProgress(); drawLog(); drawHistory();
      if (scroll && dayBar) dayBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ----- day picker -----
    function drawDayBar() {
      if (!dayBar) return;
      dayBar.replaceChildren();
      var prev = h('button', 'sp-day-arrow', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous day');
      prev.addEventListener('click', function () { setDay(addDays(selDay, -1)); });
      var next = h('button', 'sp-day-arrow', '›'); next.type = 'button'; next.setAttribute('aria-label', 'Next day');
      next.disabled = selDay >= today();
      next.addEventListener('click', function () { setDay(addDays(selDay, 1)); });
      var mid = h('label', 'sp-day-mid');
      mid.append(h('span', 'sp-day-k', 'Practice day'), h('span', 'sp-day-v', dayName(selDay)), h('span', 'sp-day-sub', fmtDate(selDay)));
      var pick = h('input', 'sp-day-input'); pick.type = 'date'; pick.max = today(); pick.value = selDay; pick.setAttribute('aria-label', 'Pick a practice day');
      pick.addEventListener('change', function () { if (/^\d{4}-\d{2}-\d{2}$/.test(pick.value)) setDay(pick.value <= today() ? pick.value : today()); });
      mid.append(pick);
      dayBar.append(prev, mid, next);
      if (selDay !== today()) {
        var tb = h('button', 'sp-day-today', 'Jump to today'); tb.type = 'button';
        tb.addEventListener('click', function () { setDay(today()); });
        dayBar.append(tb);
      }
    }

    if (tabs.length) {
      var wrap = rv(h('section'));
      wrap.append(h('div', 'section-label', 'Practice'));
      dayBar = h('div', 'sp-day'); wrap.append(dayBar);
      var bar = h('div', 'sp-tabs'); bar.setAttribute('role', 'tablist');
      var panelHost = h('div');
      var saved = store.get(KEY + 'tab');
      var active = (typeof saved === 'number' && saved < tabs.length) ? saved : 0;
      var tabBtns = tabs.map(function (t, ti) {
        var b = h('button', 'sp-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'tab-' + ti;
        b.style.setProperty('--c', t.color || TAB_COLORS[ti % TAB_COLORS.length]);
        b.append(h('span', 'dot'), document.createTextNode(t.name || ('Part ' + (ti + 1))));
        b.addEventListener('click', function () { if (active !== ti) { active = ti; store.set(KEY + 'tab', ti); drawTab(); } });
        b.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          active = (active + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          store.set(KEY + 'tab', active); drawTab(); tabBtns[active].focus();
        });
        bar.append(b); return b;
      });

      drawTab = function () {
        tabBtns.forEach(function (b, bi) { b.setAttribute('aria-selected', String(bi === active)); b.tabIndex = bi === active ? 0 : -1; });
        var t = tabs[active] || {};
        var color = t.color || TAB_COLORS[active % TAB_COLORS.length];
        var panel = h('div', 'sp-panel'); panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'tab-' + active);
        panel.style.setProperty('--c', color);

        var fix = list(t.fix);
        if (fix.length) {
          var fc = h('div', 'sp-card');
          var fh = h('div', 'sp-card-h'); var h2 = h('h2'); var ic = h('span', 'ic'); ic.append(svg(ICON.fix)); h2.append(ic, 'What to Fix'); fh.append(h2); fc.append(fh);
          var ul = h('ul', 'sp-fix'); fix.forEach(function (f) { ul.append(h('li', null, asItem(f).text || '')); });
          fc.append(ul); panel.append(fc);
        }

        var mine = drills.filter(function (x) { return x.ti === active; });
        if (mine.length) {
          var pc = h('div', 'sp-card');
          var ph = h('div', 'sp-card-h'); var h2b = h('h2'); var ic2 = h('span', 'ic'); ic2.append(svg(ICON.drill)); h2b.append(ic2, 'How to Practice');
          var cnt = h('span', 'sp-count'); ph.append(h2b, cnt); pc.append(ph);
          var ol = h('ul', 'sp-check');
          var tabCount = function () {
            var rec = dayRec(selDay), n = 0; mine.forEach(function (x) { if (rec && rec.checks[x.id]) n++; });
            cnt.textContent = n + ' / ' + mine.length; cnt.className = 'sp-count' + (n === mine.length ? ' done' : '');
          };
          mine.forEach(function (x) {
            var it = x.item, rec0 = dayRec(selDay), on = !!(rec0 && rec0.checks[x.id]);
            var li = h('li', 'sp-item' + (on ? ' on' : ''));
            var lab = h('label'); var inp = h('input'); inp.type = 'checkbox'; inp.checked = on;
            var box = h('span', 'sp-box'); box.append(svg(ICON.check));
            var txt = h('span', 'sp-item-text'); txt.append(h('span', 'sp-item-title', it.text || ''));
            if (it.target) txt.append(h('span', 'sp-target', it.target));
            if (it.note) txt.append(h('span', 'sp-item-note', it.note));
            lab.append(inp, box, txt);
            inp.addEventListener('change', function () {
              var rec = dayRec(selDay, true);
              if (inp.checked) rec.checks[x.id] = it.text || 'Drill'; else delete rec.checks[x.id];
              li.classList.toggle('on', inp.checked);
              var allNow = inp.checked && sessionDone(rec) === total;
              touch(selDay); tabCount(); updateProgress(); drawHistory();
              if (allNow) { burstAt(box, 30); burstAt(barFill && barFill.parentNode, 40); }
            });
            li.append(lab);
            var href = safeHref(it.link);
            if (href) {
              var lw = h('div', 'sp-item-link'); var a = h('a', null, it.linkText || 'Open');
              a.href = href;
              if (/^https?:/.test(href) && new URL(href).host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; a.append(svg(ICON.ext)); }
              lw.append(a); li.append(lw);
            }
            ol.append(li);
          });
          pc.append(ol); panel.append(pc); tabCount();
        }
        if (!fix.length && !mine.length) panel.append(h('div', 'sp-card', 'Nothing here this session.'));
        panelHost.replaceChildren(panel);
      };

      wrap.append(bar, panelHost);
      if (total) {
        var prog = h('div', 'sp-progress'); barFill = h('i'); prog.append(barFill);
        var row = h('div', 'sp-reset-row'); barNote = h('span', 'note');
        resetBtn = h('button', 'btn btn-secondary', 'Reset for today'); resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          var rec = dayRec(selDay); if (!rec) return;
          drills.forEach(function (x) { delete rec.checks[x.id]; });
          touch(selDay); drawTab(); updateProgress(); drawHistory();
        });
        row.append(barNote, resetBtn);
        wrap.append(prog, row);
      }
      logHost = h('div'); wrap.append(logHost);
      main.append(wrap);
    } else {
      var wrap2 = rv(h('section'));
      wrap2.append(h('div', 'section-label', 'Practice'));
      dayBar = h('div', 'sp-day'); logHost = h('div'); wrap2.append(dayBar, logHost); main.append(wrap2);
    }

    // ----- day log: minutes, average, notes -----
    function drawLog() {
      if (!logHost) return;
      var rec = dayRec(selDay) || {};
      var card = h('div', 'sp-card sp-log');
      var hd = h('div', 'sp-card-h'); var h2 = h('h2'); var ic = h('span', 'ic'); ic.append(svg(ICON.pen));
      h2.append(ic, selDay === today() ? 'Today’s Log' : 'Log for ' + shortDate(selDay));
      var saved = h('span', 'sp-saved', ''); hd.append(h2, saved); card.append(hd);
      var flash = function () { saved.textContent = '✓ Saved'; saved.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(function () { saved.classList.remove('on'); }, 1400); };

      // minutes
      var mf = h('div', 'sp-field'); mf.append(h('span', 'sp-field-k', 'Time practiced'));
      var chips = h('div', 'sp-mins');
      var custom = h('input', 'sp-in sp-in-min'); custom.type = 'number'; custom.inputMode = 'numeric'; custom.min = '0'; custom.max = '600'; custom.placeholder = 'Other';
      custom.setAttribute('aria-label', 'Minutes practiced');
      var drawChips = function () {
        var m = (dayRec(selDay) || {}).minutes || 0;
        chips.querySelectorAll('.sp-min').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.m === m)); });
        custom.value = m && [15, 30, 45, 60, 90].indexOf(m) < 0 ? String(m) : '';
      };
      [15, 30, 45, 60, 90].forEach(function (m) {
        var b = h('button', 'sp-min', m < 60 ? m + 'm' : (m / 60) + 'h' + (m % 60 ? '' : '')); b.type = 'button'; b.dataset.m = String(m);
        if (m === 90) b.textContent = '1.5h';
        b.addEventListener('click', function () {
          var r = dayRec(selDay, true); r.minutes = r.minutes === m ? 0 : m;
          touch(selDay); drawChips(); drawHistory(); flash();
        });
        chips.append(b);
      });
      custom.addEventListener('input', function () {
        var v = Math.max(0, Math.min(600, Math.round(+custom.value || 0)));
        var r = dayRec(selDay, true); r.minutes = v; touch(selDay);
        chips.querySelectorAll('.sp-min').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.m === v)); });
        drawHistory(); flash();
      });
      var minWrap = h('div', 'sp-min-custom'); minWrap.append(custom, h('span', null, 'min'));
      chips.append(minWrap); mf.append(chips); card.append(mf); drawChips();

      // average
      var af = h('label', 'sp-field'); af.append(h('span', 'sp-field-k', 'Average this day'));
      var ar = h('div', 'sp-avg-row');
      var ai = h('input', 'sp-in sp-in-avg'); ai.type = 'text'; ai.inputMode = 'decimal'; ai.placeholder = 'e.g. 12.4'; ai.autocomplete = 'off';
      ai.value = rec.avg != null && rec.avg !== '' ? String(rec.avg) : '';
      ai.addEventListener('input', function () {
        var v = ai.value.trim(), n = parseFloat(v.replace(',', '.'));
        var r = dayRec(selDay, true); r.avg = v === '' ? '' : (isFinite(n) && n > 0 && n < 600 ? Math.round(n * 100) / 100 : r.avg);
        touch(selDay); flash(); drawHistory();
      });
      ar.append(ai, h('span', 'sp-avg-unit', 'sec'));
      af.append(ar); card.append(af);

      // notes
      var nf = h('label', 'sp-field'); nf.append(h('span', 'sp-field-k', 'Notes'));
      var ta = h('textarea', 'sp-in sp-notes'); ta.rows = 4; ta.placeholder = 'What clicked? What felt slow?'; ta.value = rec.note || '';
      ta.addEventListener('input', function () {
        clearTimeout(ta.t);
        ta.t = setTimeout(function () { var r = dayRec(selDay, true); r.note = ta.value; touch(selDay); flash(); drawHistory(); }, 350);
      });
      nf.append(ta); card.append(nf);
      card.append(h('p', 'sp-fine', 'Saves automatically on this device.'));
      logHost.replaceChildren(card);
    }

    // ----- history -----
    var hist = rv(h('section', 'sp-hist'));
    hist.append(h('div', 'section-label', 'Practice History'));
    histHost = h('div'); var histStatus = h('p', 'sp-fine sp-status'); histStatus.setAttribute('role', 'status');
    hist.append(histHost, histStatus); main.append(hist);
    var showAll = false;

    function drawHistory() {
      if (!histHost) return;
      histHost.replaceChildren();
      var days = Object.keys(log.days).filter(function (d) { return practiced(log.days[d]); }).sort().reverse();

      // tiles
      var tiles = h('div', 'sp-tiles');
      var st = streak();
      var tile = function (k, v, sub, cls) { var t = h('div', 'sp-tile' + (cls ? ' ' + cls : '')); t.append(h('span', 'sp-tile-v', v), h('span', 'sp-tile-k', k)); if (sub) t.append(h('span', 'sp-tile-sub', sub)); return t; };
      var mins = 0; days.forEach(function (d) { mins += +log.days[d].minutes || 0; });
      tiles.append(
        tile('Day streak', st ? st + ' 🔥' : '0', '', st ? 'hot' : ''),
        tile('This week', weekCount() + '/7', ''),
        tile('Total time', fmtMins(mins), '')
      );
      histHost.append(tiles);

      // two-week strip
      var strip = h('div', 'sp-strip'); strip.setAttribute('aria-label', 'Last 14 days');
      for (var k = 13; k >= 0; k--) {
        var d = addDays(today(), -k), r = log.days[d], lvl = 0;
        if (practiced(r)) { var n = Object.keys(r.checks || {}).length; lvl = total ? Math.max(1, Math.min(4, Math.ceil(4 * n / total))) : 2; if (!n) lvl = 1; }
        var b = h('button', 'sp-cell lv' + lvl + (d === selDay ? ' sel' : '') + (d === today() ? ' now' : '')); b.type = 'button';
        var dd = parseDate(d);
        b.append(h('span', 'sp-cell-w', dd.toLocaleDateString('en-US', { weekday: 'narrow' })), h('span', 'sp-cell-n', String(dd.getDate())));
        b.setAttribute('aria-label', fmtDate(d) + (practiced(r) ? ', practiced' : ', no practice'));
        b.title = fmtDate(d) + (practiced(r) ? ': ' + summary(r) : '');
        (function (day) { b.addEventListener('click', function () { setDay(day, true); }); })(d);
        strip.append(b);
      }
      histHost.append(strip);

      // average chart
      var pts = Object.keys(log.days).sort().map(function (d) { return { d: d, v: +log.days[d].avg }; }).filter(function (p) { return p.v > 0; }).slice(-30);
      if (pts.length >= 2) histHost.append(avgChart(pts));
      else if (pts.length === 1) histHost.append(h('p', 'sp-fine sp-chart-hint', 'Log your average on one more day to see your trend.'));

      // day list
      if (!days.length) {
        var em = h('div', 'sp-empty'); em.append(h('b', null, 'No practice logged yet'), h('span', null, 'Check off a drill or log your time to start your streak.'));
        histHost.append(em);
      } else {
        var ul = h('ul', 'sp-days');
        (showAll ? days : days.slice(0, 7)).forEach(function (d) {
          var r = log.days[d];
          var li = h('li'); var b = h('button', 'sp-dayrow' + (d === selDay ? ' sel' : '')); b.type = 'button';
          var l = h('span', 'sp-dayrow-main');
          l.append(h('b', null, dayName(d) === 'Today' || dayName(d) === 'Yesterday' ? dayName(d) + ', ' + shortDate(d) : dayName(d)), h('small', null, summary(r)));
          if ((r.note || '').trim()) l.append(h('span', 'sp-dayrow-note', r.note.trim()));
          b.append(l, h('span', 'arrow', '→'));
          b.addEventListener('click', function () { setDay(d, true); });
          li.append(b); ul.append(li);
        });
        histHost.append(ul);
        if (days.length > 7) {
          var more = h('button', 'btn btn-secondary sp-more', showAll ? 'Show less' : 'Show all ' + days.length + ' days'); more.type = 'button';
          more.addEventListener('click', function () { showAll = !showAll; drawHistory(); });
          histHost.append(more);
        }
      }

      // share + backup
      var acts = h('div', 'sp-actions');
      var share = h('button', 'btn btn-primary', 'Send to Caiden'); share.type = 'button';
      var status = histStatus;
      share.disabled = !days.length;
      share.addEventListener('click', function () {
        var text = shareText();
        var done = function (msg) { status.textContent = msg; };
        if (navigator.share) navigator.share({ title: (data.name || 'Student') + '’s practice', text: text }).then(function () { done('Sent.'); }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(text, done); });
        else copy(text, done);
      });
      var bk = h('button', 'btn btn-secondary', 'Back up'); bk.type = 'button';
      bk.disabled = !days.length;
      bk.addEventListener('click', function () {
        var blob = new Blob([JSON.stringify({ app: 'caidenlee-practice', student: slug, exported: new Date().toISOString(), log: log }, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slug + '-practice-' + today() + '.json';
        document.body.append(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        status.textContent = 'Backup saved. Keep the file somewhere safe, like Files or Google Drive.';
      });
      var rs = h('button', 'btn btn-secondary', 'Restore'); rs.type = 'button';
      var file = h('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.hidden = true;
      rs.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; if (!f) return;
        f.text().then(function (t) {
          var o = JSON.parse(t), inc = o && o.log && o.log.days ? o.log.days : (o && o.days ? o.days : null);
          if (!inc || typeof inc !== 'object') throw new Error('bad');
          var added = 0;
          Object.keys(inc).forEach(function (d) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !inc[d] || typeof inc[d] !== 'object') return;
            var cur = log.days[d];
            if (!cur || (+inc[d].updated || 0) > (+cur.updated || 0)) { log.days[d] = inc[d]; if (!log.days[d].checks) log.days[d].checks = {}; added++; }
          });
          saveLog(); setDay(selDay);
          status.textContent = added ? 'Restored ' + added + (added === 1 ? ' day.' : ' days.') : 'Nothing new in that backup.';
        }).catch(function () { status.textContent = 'That file isn’t a practice backup.'; });
        file.value = '';
      });
      acts.append(share, bk, rs, file);
      histHost.append(acts);
    }

    // ----- average chart: one series, goal as a dashed reference line -----
    function avgChart(pts) {
      var wrapC = h('div', 'sp-chart');
      var head = h('div', 'sp-chart-h'); head.append(h('b', null, 'Your average'), h('span', null, 'Lower is faster'));
      wrapC.append(head);
      var W = 340, H = 150, L = 34, R = 14, T = 14, B = 26;
      var vals = pts.map(function (p) { return p.v; }); var goal = tgt > 0 ? tgt : null;
      var lo = Math.min.apply(null, vals.concat(goal ? [goal] : [])), hi = Math.max.apply(null, vals.concat(goal ? [goal] : []));
      var pad = Math.max(0.3, (hi - lo) * 0.15); lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
      // x follows real dates, so a gap of two weeks looks like two weeks
      var dn = pts.map(function (p) { return Math.round(parseDate(p.d).getTime() / 864e5); });
      var span = Math.max(1, dn[dn.length - 1] - dn[0]);
      var x = function (i) { return L + (dn[i] - dn[0]) * (W - L - R) / span; };
      var y = function (v) { return T + (hi - v) * (H - T - B) / (hi - lo); };
      var NS = 'http://www.w3.org/2000/svg';
      var mk = function (tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; };
      var sv = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sp-chart-svg', role: 'img', 'aria-label': 'Average by day, from ' + vals[0] + ' to ' + vals[vals.length - 1] + ' seconds' });
      [lo, (lo + hi) / 2, hi].forEach(function (v) {
        sv.append(mk('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
        var tx = mk('text', { x: L - 6, y: y(v) + 3.5, class: 'tick', 'text-anchor': 'end' }); tx.textContent = (Math.round(v * 10) / 10).toString(); sv.append(tx);
      });
      if (goal) {
        sv.append(mk('line', { x1: L, x2: W - R, y1: y(goal), y2: y(goal), class: 'goal' }));
        var gt = mk('text', { x: W - R, y: y(goal) - 5, class: 'goal-lbl', 'text-anchor': 'end' }); gt.textContent = 'Goal ' + goal; sv.append(gt);
      }
      var dpath = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
      sv.append(mk('path', { d: dpath, class: 'line' }));
      pts.forEach(function (p, i) { sv.append(mk('circle', { cx: x(i), cy: y(p.v), r: 4, class: 'dot' })); });
      [0, pts.length - 1].forEach(function (i, j) {
        var t = mk('text', { x: x(i), y: H - 8, class: 'tick', 'text-anchor': j ? 'end' : 'start' }); t.textContent = shortDate(pts[i].d); sv.append(t);
      });
      var cross = mk('line', { x1: 0, x2: 0, y1: T, y2: H - B, class: 'cross' }); var hot = mk('circle', { r: 6, class: 'hot' });
      cross.style.display = hot.style.display = 'none'; sv.append(cross, hot);
      var tip = h('div', 'sp-tip'); tip.hidden = true;
      var show = function (ev) {
        var rect = sv.getBoundingClientRect(), px = (ev.clientX - rect.left) * W / rect.width;
        var best = 0; pts.forEach(function (p, i) { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
        var p = pts[best];
        cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best)); hot.setAttribute('cx', x(best)); hot.setAttribute('cy', y(p.v));
        cross.style.display = hot.style.display = '';
        tip.replaceChildren(h('b', null, p.v + 's'), h('span', null, shortDate(p.d)));
        tip.hidden = false;
        var left = x(best) * rect.width / W; tip.style.left = Math.max(40, Math.min(rect.width - 40, left)) + 'px'; tip.style.top = (y(p.v) * rect.height / H) + 'px';
      };
      var hide = function () { tip.hidden = true; cross.style.display = hot.style.display = 'none'; };
      sv.addEventListener('pointermove', show); sv.addEventListener('pointerdown', show); sv.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') hide(); });
      var plot = h('div', 'sp-chart-plot'); plot.append(sv, tip); wrapC.append(plot);
      return wrapC;
    }

    function shareText() {
      var lines = [(data.name || 'Student') + '’s practice', ''];
      lines.push('Streak: ' + streak() + (streak() === 1 ? ' day' : ' days') + '. This week: ' + weekCount() + '/7 days.');
      lines.push('');
      var days = Object.keys(log.days).filter(function (d) { return practiced(log.days[d]); }).sort().reverse().slice(0, 7);
      days.forEach(function (d) {
        var r = log.days[d];
        var nm = dayName(d); lines.push((nm === 'Today' || nm === 'Yesterday' ? nm + ', ' + shortDate(d) : nm) + ': ' + summary(r));
        var done = Object.keys(r.checks || {}).map(function (k) { return r.checks[k]; }).filter(function (v) { return typeof v === 'string'; });
        if (done.length) lines.push('  Did: ' + done.join(', '));
        if ((r.note || '').trim()) lines.push('  Notes: ' + r.note.trim());
      });
      return lines.join('\n');
    }

    drawDayBar(); drawTab(); updateProgress(); drawLog(); drawHistory();

    // past sessions
    if (sessions.length > 1) {
      var ps = rv(h('section'));
      ps.append(h('div', 'section-label', 'Past Sessions'));
      var pl = h('ul', 'sp-past-list');
      sessions.forEach(function (x, xi) {
        if (x === s) return;
        var li = h('li'); var b = h('button', 'sp-past-btn'); b.type = 'button';
        var l = h('span'); l.append(h('b', null, fmtDate(x.date) + (xi === 0 ? ' (latest)' : '')), h('small', null, x.theme && x.theme.title ? 'Big Theme: ' + x.theme.title : 'Session notes'));
        b.append(l, h('span', 'arrow', '→'));
        b.addEventListener('click', function () { goSession(x.id); });
        li.append(b); pl.append(li);
      });
      ps.append(pl); main.append(ps);
    }

    // bottom banner
    var cta = rv(h('section', 'sp-cta'));
    cta.append(h('h3', null, 'Do lots of solves!'));
    var cb = h('a', 'btn btn-primary', 'Book your next session'); cb.href = COACHING_URL;
    cta.append(cb); main.append(cta);

    reveal();
  }

  function goSession(id) {
    if (id === sessions[0].id) { history.pushState(null, '', location.pathname + location.search); render(); }
    else location.hash = encodeURIComponent(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reveal() {
    var els = main.querySelectorAll('.rv');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); }); return;
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }
})();
