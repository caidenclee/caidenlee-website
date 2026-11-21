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
      if (!Object.keys(r.checks || {}).length && !(+r.minutes > 0) && !(+r.avg > 0) && !String(r.note || '').trim() && !(r.plan && r.plan.tabs && r.plan.tabs.length)) delete log.days[d];
    }
    saveLog();
    if (onTouch) onTouch(d);
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
    var fail = function () { done(false); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fail);
    else fail();
  }

  // ---------- save to a Google Sheet ----------
  // The student's own Sheet runs a small script (students/google-sheet-script.js)
  // published as a web app. The page posts each day to that URL.
  var onTouch = null;
  function validScriptUrl(u) { return typeof u === 'string' && /^https:\/\/script\.google\.com\/(a\/[^\/]+\/)?macros\/s\/[\w-]+\/exec$/.test(u.trim()); }
  function syncCfg() {
    var c = store.get(KEY + 'sync');
    if (c && validScriptUrl(c.url) && !(c.fromCoach && data && c.url !== data.saveTo)) return c;
    if (data && validScriptUrl(data.saveTo)) return { url: data.saveTo.trim(), kind: '', name: '', fromCoach: true };
    return null;
  }
  function savedMap() { return store.get(KEY + 'saved') || {}; }
  function markSaved(days) { var m = savedMap(), t = Date.now(); days.forEach(function (d) { m[d] = t; }); store.set(KEY + 'saved', m); }
  function postToGoogle(url, payload) {
    var body = JSON.stringify(payload); // sent as text/plain, so the browser skips the CORS preflight
    return fetch(url, { method: 'POST', body: body, redirect: 'follow' }).then(function (r) { return r.text(); }).then(function (t) {
      var j; try { j = JSON.parse(t); } catch (e) {
        throw new Error(/<html/i.test(t) ? 'Google asked for a sign-in. In the deployment, set Who has access to Anyone.' : 'Google sent an unexpected reply.');
      }
      if (!j || !j.ok) throw new Error((j && j.error) || 'The script didn’t accept the save.');
      return j;
    }, function () {
      // Reply blocked by the browser: send anyway without reading the answer.
      return fetch(url, { method: 'POST', body: body, mode: 'no-cors' }).then(function () { return { ok: true, unconfirmed: true }; });
    });
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

    // ================= PRACTICE =================
    // Each day: Start practice -> pick areas -> that day's agenda of drills -> log + save.
    var tabs = list(s.tabs);
    var drills = [];
    tabs.forEach(function (t, ti) {
      list(t.practice).forEach(function (raw, pi) { drills.push({ id: s.id + '|' + ti + '-' + pi, ti: ti, pi: pi, item: asItem(raw) }); });
    });
    var total = drills.length;
    if (!selDay || selDay > today()) selDay = today();
    var dayBar, agendaHost, logHost, histHost, picking = false, pickSel = [];
    var tabName = function (ti) { return (tabs[ti] && tabs[ti].name) || ('Part ' + (ti + 1)); };
    var tabColor = function (ti) { return (tabs[ti] && tabs[ti].color) || TAB_COLORS[ti % TAB_COLORS.length]; };

    function planTabs(rec) {
      if (!rec) return null;
      if (rec.plan && Array.isArray(rec.plan.tabs)) return rec.plan.tabs.filter(function (ti) { return ti >= 0 && ti < tabs.length; });
      if (practiced(rec) || String(rec.note || '').trim()) return tabs.map(function (_, i) { return i; }); // logged before agendas existed
      return null;
    }
    function agendaDrills(rec) { var p = planTabs(rec) || []; return drills.filter(function (x) { return p.indexOf(x.ti) >= 0; }); }
    function started(d) { return planTabs(dayRec(d)) !== null; }
    function longDay(d) { return parseDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }

    function setDay(d, scroll) {
      if (!d || d > today()) return;
      selDay = d; picking = false; drawDayBar(); drawAgenda(); drawLog(); drawHistory();
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

    // ----- start card / area picker / agenda -----
    function drawAgenda() {
      if (!agendaHost) return;
      agendaHost.replaceChildren();
      var rec = dayRec(selDay), plan = planTabs(rec), isToday = selDay === today();

      if (!tabs.length) return;

      if (plan === null && !picking) {
        var st = h('div', 'sp-start');
        st.append(h('span', 'sp-start-k', isToday ? 'New day' : 'Not logged yet'),
          h('h2', null, isToday ? 'Ready to practice, ' + (data.name || 'friend') + '?' : 'Nothing logged for this day.'));
        var go = h('button', 'btn btn-primary sp-start-btn', 'Start practice for ' + (isToday ? parseDate(selDay).toLocaleDateString('en-US', { weekday: 'long' }) : longDay(selDay))); go.type = 'button';
        go.addEventListener('click', function () { picking = true; pickSel = []; drawAgenda(); });
        st.append(go); agendaHost.append(st);
        return;
      }

      if (picking) {
        var pk = h('div', 'sp-card sp-pick');
        pk.append(h('h2', 'sp-pick-q', isToday ? 'What do you want to practice today?' : 'What did you practice on ' + shortDate(selDay) + '?'));
        var grid = h('div', 'sp-areas'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Areas to practice');
        var build = h('button', 'btn btn-primary sp-build', 'Build my agenda'); build.type = 'button';
        var sync = function () {
          grid.querySelectorAll('.sp-area').forEach(function (b) { b.setAttribute('aria-pressed', String(pickSel.indexOf(+b.dataset.ti) >= 0)); });
          build.disabled = !pickSel.length;
        };
        tabs.forEach(function (t, ti) {
          var n = drills.filter(function (x) { return x.ti === ti; }).length;
          var b = h('button', 'sp-area'); b.type = 'button'; b.dataset.ti = String(ti); b.style.setProperty('--c', tabColor(ti));
          var tx = h('span', 'sp-area-text'); tx.append(h('b', null, tabName(ti)), h('small', null, n + (n === 1 ? ' drill' : ' drills')));
          b.append(h('span', 'dot'), tx, h('span', 'sp-area-tick', '✓'));
          b.addEventListener('click', function () {
            var i = pickSel.indexOf(ti); if (i >= 0) pickSel.splice(i, 1); else pickSel.push(ti);
            sync();
          });
          grid.append(b);
        });
        var allB = h('button', 'sp-linkbtn', 'Pick everything'); allB.type = 'button';
        allB.addEventListener('click', function () { pickSel = tabs.map(function (_, i) { return i; }); sync(); });
        build.addEventListener('click', function () {
          if (!pickSel.length) return;
          var r = dayRec(selDay, true), keep = pickSel.slice().sort();
          r.plan = { session: s.id, tabs: keep };
          Object.keys(r.checks).forEach(function (k) { // drop checks for areas that were taken off
            var x = drills.filter(function (dd) { return dd.id === k; })[0];
            if (x && keep.indexOf(x.ti) < 0) delete r.checks[k];
          });
          picking = false; touch(selDay); drawAgenda(); drawLog(); drawHistory();
          agendaHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        var acts = h('div', 'sp-pick-acts'); acts.append(build);
        if (plan !== null) {
          var cancel = h('button', 'btn btn-secondary', 'Cancel'); cancel.type = 'button';
          cancel.addEventListener('click', function () { picking = false; drawAgenda(); });
          acts.append(cancel);
        }
        pk.append(grid, allB, acts); agendaHost.append(pk); sync();
        return;
      }

      // agenda
      var items = agendaDrills(rec);
      var card = h('div', 'sp-card sp-agenda');
      var hd = h('div', 'sp-card-h'); var h2 = h('h2'); var ic = h('span', 'ic'); ic.append(svg(ICON.drill));
      h2.append(ic, isToday ? 'Today’s Agenda' : 'Agenda for ' + shortDate(selDay));
      var cnt = h('span', 'sp-count'); hd.append(h2, cnt); card.append(hd);
      var prog = h('div', 'sp-progress'); var fill = h('i'); prog.append(fill); card.append(prog);
      var note = h('p', 'sp-agenda-note');
      var count = function () {
        var r = dayRec(selDay), n = 0; items.forEach(function (x) { if (r && r.checks[x.id]) n++; });
        cnt.textContent = n + ' / ' + items.length; cnt.className = 'sp-count' + (n === items.length && items.length ? ' done' : '');
        fill.style.width = items.length ? (100 * n / items.length) + '%' : '0';
        note.className = 'sp-agenda-note' + (n === items.length && items.length ? ' all' : '');
        note.textContent = n === items.length && items.length ? (isToday ? 'Agenda done. Nice work!' : 'Agenda done for this day.') : (items.length - n) + ' to go';
        return n;
      };
      if (!items.length) card.append(h('p', 'sp-fine', 'No drills in these areas yet. Check the notes below.'));
      (plan || []).forEach(function (ti) {
        var mine = items.filter(function (x) { return x.ti === ti; });
        if (!mine.length) return;
        var grp = h('div', 'sp-group'); grp.style.setProperty('--c', tabColor(ti));
        grp.append(h('div', 'sp-group-h', tabName(ti)));
        var ol = h('ul', 'sp-check');
        mine.forEach(function (x) {
          var it = x.item, r0 = dayRec(selDay), on = !!(r0 && r0.checks[x.id]);
          var li = h('li', 'sp-item' + (on ? ' on' : ''));
          var lab = h('label'); var inp = h('input'); inp.type = 'checkbox'; inp.checked = on;
          var box = h('span', 'sp-box'); box.append(svg(ICON.check));
          lab.append(inp, box, drillText(it));
          inp.addEventListener('change', function () {
            var r = dayRec(selDay, true);
            if (inp.checked) r.checks[x.id] = it.text || 'Drill'; else delete r.checks[x.id];
            li.classList.toggle('on', inp.checked);
            touch(selDay);
            var n = count();
            if (inp.checked && n === items.length) { burstAt(box, 30); burstAt(prog, 40); }
            drawHistory();
          });
          li.append(lab); drillLink(li, it); ol.append(li);
        });
        grp.append(ol); card.append(grp);
      });
      var foot = h('div', 'sp-agenda-foot'); foot.append(note);
      var edit = h('button', 'sp-linkbtn', 'Edit agenda'); edit.type = 'button';
      edit.addEventListener('click', function () { picking = true; pickSel = (planTabs(dayRec(selDay)) || []).slice(); drawAgenda(); });
      var reset = h('button', 'sp-linkbtn', 'Uncheck all'); reset.type = 'button';
      reset.addEventListener('click', function () {
        var r = dayRec(selDay); if (!r) return;
        items.forEach(function (x) { delete r.checks[x.id]; });
        touch(selDay); drawAgenda(); drawHistory();
      });
      var links = h('span', 'sp-agenda-links'); links.append(edit, reset); foot.append(links);
      card.append(foot); agendaHost.append(card); count();
    }

    function drillText(it) {
      var txt = h('span', 'sp-item-text'); txt.append(h('span', 'sp-item-title', it.text || ''));
      if (it.target) txt.append(h('span', 'sp-target', it.target));
      if (it.note) txt.append(h('span', 'sp-item-note', it.note));
      return txt;
    }
    function drillLink(li, it) {
      var href = safeHref(it.link); if (!href) return;
      var lw = h('div', 'sp-item-link'); var a = h('a', null, it.linkText || 'Open');
      a.href = href;
      if (/^https?:/.test(href) && new URL(href).host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; a.append(svg(ICON.ext)); }
      lw.append(a); li.append(lw);
    }

    var wrap = rv(h('section', 'sp-practice'));
    wrap.append(h('div', 'section-label', 'Practice'));
    dayBar = h('div', 'sp-day'); agendaHost = h('div', 'sp-agenda-host'); logHost = h('div');
    wrap.append(dayBar, agendaHost, logHost);
    main.append(wrap);

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

    // ----- session notes: What to Fix + How to Practice, by area (read only) -----
    if (tabs.length) {
      var nw = rv(h('section', 'sp-notes-sec'));
      nw.append(h('div', 'section-label', 'Session Notes'));
      var bar = h('div', 'sp-tabs'); bar.setAttribute('role', 'tablist');
      var panelHost = h('div');
      var saved = store.get(KEY + 'tab');
      var active = (typeof saved === 'number' && saved < tabs.length) ? saved : 0;
      var drawTab = function () {
        tabBtns.forEach(function (b, bi) { b.setAttribute('aria-selected', String(bi === active)); b.tabIndex = bi === active ? 0 : -1; });
        var t = tabs[active] || {};
        var panel = h('div', 'sp-panel'); panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'tab-' + active);
        panel.style.setProperty('--c', tabColor(active));
        var fix = list(t.fix);
        if (fix.length) {
          var fc = h('div', 'sp-card');
          var fh = h('div', 'sp-card-h'); var fh2 = h('h2'); var fic = h('span', 'ic'); fic.append(svg(ICON.fix)); fh2.append(fic, 'What to Fix'); fh.append(fh2); fc.append(fh);
          var ul = h('ul', 'sp-fix'); fix.forEach(function (f) { ul.append(h('li', null, asItem(f).text || '')); });
          fc.append(ul); panel.append(fc);
        }
        var mine = drills.filter(function (x) { return x.ti === active; });
        if (mine.length) {
          var pc = h('div', 'sp-card');
          var ph = h('div', 'sp-card-h'); var ph2 = h('h2'); var pic = h('span', 'ic'); pic.append(svg(ICON.drill)); ph2.append(pic, 'How to Practice'); ph.append(ph2); pc.append(ph);
          var ol = h('ul', 'sp-check');
          mine.forEach(function (x) {
            var li = h('li', 'sp-item ro'); var row = h('div', 'sp-ro'); row.append(drillText(x.item)); li.append(row); drillLink(li, x.item); ol.append(li);
          });
          pc.append(ol); panel.append(pc);
        }
        if (!fix.length && !mine.length) panel.append(h('div', 'sp-card', 'Nothing here this session.'));
        panelHost.replaceChildren(panel);
      };
      var tabBtns = tabs.map(function (t, ti) {
        var b = h('button', 'sp-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'tab-' + ti;
        b.style.setProperty('--c', tabColor(ti));
        b.append(h('span', 'dot'), document.createTextNode(tabName(ti)));
        b.addEventListener('click', function () { if (active !== ti) { active = ti; store.set(KEY + 'tab', ti); drawTab(); } });
        b.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          active = (active + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          store.set(KEY + 'tab', active); drawTab(); tabBtns[active].focus();
        });
        bar.append(b); return b;
      });
      nw.append(bar, panelHost); main.append(nw); drawTab();
    }

    // ----- day log: minutes, average, notes -----
    function drawLog() {
      if (!logHost) return;
      if (!started(selDay)) { logHost.replaceChildren(); onTouch = null; return; }
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
      // save to Google
      var sv = h('div', 'sp-save');
      var saveLabel = function () { return selDay === today() ? 'Save progress for today' : 'Save progress for ' + shortDate(selDay); };
      var sb = h('button', 'btn btn-primary sp-save-btn', saveLabel()); sb.type = 'button';
      var sl = h('p', 'sp-save-status'); sl.setAttribute('role', 'status');
      var refresh = function (msg, cls) {
        var cfg = syncCfg(), where = cfg ? (cfg.name || 'your Google Sheet') : '';
        sl.className = 'sp-save-status' + (cls ? ' ' + cls : '');
        sl.replaceChildren();
        if (msg) sl.append(msg);
        else if (!cfg) sl.append('Link a Google Sheet to save your progress there.');
        else {
          var at = savedMap()[selDay], r = log.days[selDay];
          if (at && (!r || +r.updated <= at)) { sl.className += ' ok'; sl.append('✓ Saved to ' + where + ' at ' + new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })); }
          else if (at) sl.append('You changed this day since your last save.');
          else sl.append('Saves to ' + where + '.');
        }
        var lk = h('button', 'sp-linkbtn', cfg ? 'Change' : 'Link it'); lk.type = 'button';
        lk.addEventListener('click', function () { openConnect(); });
        sl.append(' ', lk);
      };
      sb.addEventListener('click', function () {
        var cfg = syncCfg(); if (!cfg) { openConnect(); return; }
        if (!log.days[selDay]) { refresh('Nothing logged for this day yet.', 'bad'); return; }
        sb.disabled = true; sb.textContent = 'Saving…';
        postToGoogle(cfg.url, { student: data.name || slug, days: [dayPayload(selDay)] }).then(function (j) {
          if (j.name || j.kind) { cfg.name = j.name || cfg.name; cfg.kind = j.kind || cfg.kind; store.set(KEY + 'sync', cfg); }
          markSaved([selDay]);
          refresh(j.unconfirmed ? 'Sent. Open your Sheet to check it arrived.' : '', j.unconfirmed ? '' : 'ok');
          if (!j.unconfirmed) burstAt(sb, 18);
        }).catch(function (e) { refresh('Couldn’t save. ' + (e && e.message ? e.message : 'Check your connection and try again.'), 'bad'); })
          .then(function () { sb.disabled = false; sb.textContent = saveLabel(); });
      });
      onTouch = function (d) { if (d === selDay) refresh(); };
      sv.append(sb, sl); card.append(sv); refresh();
      logHost.replaceChildren(card, connectHost);
    }

    function dayPayload(d) {
      var r = log.days[d] || { checks: {} };
      var done = Object.keys(r.checks || {}).map(function (k) { return r.checks[k]; }).filter(function (v) { return typeof v === 'string'; });
      return {
        date: d, label: parseDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        focus: (planTabs(r) || []).map(tabName).join(', '),
        done: done.length, total: agendaDrills(r).length || total, drills: done, minutes: +r.minutes || 0, avg: +r.avg > 0 ? +r.avg : '',
        note: String(r.note || '').trim(), session: s.date
      };
    }

    // ----- link a Google Sheet (one-time setup) -----
    var connectHost = h('div', 'sp-connect'); connectHost.hidden = true;
    var codeCache = {};
    function getCode(kind) {
      if (codeCache[kind]) return Promise.resolve(codeCache[kind]);
      return fetch('/students/google-' + kind + '-script.js', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('x'); return r.text(); })
        .then(function (t) { codeCache[kind] = t; return t; });
    }
    function openConnect() { drawConnect(); connectHost.hidden = false; connectHost.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    function drawConnect() {
      var cfg = syncCfg();
      var kind = 'sheet';
      connectHost.replaceChildren();
      var noun = 'Sheet';
      var hd = h('div', 'sp-card-h'); var h2 = h('h2', null, 'Link a Google Sheet');
      var x = h('button', 'sp-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', function () { connectHost.hidden = true; });
      hd.append(h2, x); connectHost.append(hd);

      connectHost.append(h('p', 'sp-fine sp-connect-note', 'One-time setup. Do steps 1 to 4 on a computer, since the phone apps don’t have Apps Script.'));

      var ol = h('ol', 'sp-steps');
      var li1 = h('li'); var open = h('a', 'btn btn-secondary sp-step-btn', 'Open a new Google ' + noun);
      open.href = 'https://sheets.new'; open.target = '_blank'; open.rel = 'noopener'; open.append(svg(ICON.ext));
      li1.append(h('span', null, 'Make a new ' + noun + ' and name it, like “' + (data.name || 'My') + ' Practice”.'), open); ol.append(li1);
      ol.append(h('li', null, 'In the ' + noun + ', click Extensions, then Apps Script.'));
      var li3 = h('li');
      var cp = h('button', 'btn btn-secondary sp-step-btn', 'Copy the code'); cp.type = 'button';
      var cpMsg = h('span', 'sp-fine sp-cpmsg');
      var det = h('details', 'sp-code'); det.append(h('summary', null, 'Show the code'));
      var ta = h('textarea', 'sp-in'); ta.readOnly = true; ta.rows = 6; ta.spellcheck = false; ta.addEventListener('focus', function () { ta.select(); });
      det.append(ta);
      getCode(kind).then(function (t) { ta.value = t; }, function () {});
      cp.addEventListener('click', function () {
        var put = function (t) { copy(t, function (ok) { cpMsg.textContent = ok ? '✓ Copied' : 'Copy it from the box below.'; if (!ok) det.open = true; }); };
        if (codeCache[kind]) put(codeCache[kind]); else getCode(kind).then(put, function () { cpMsg.textContent = 'Couldn’t load the code.'; });
      });
      li3.append(h('span', null, 'Delete what’s there, paste this code, and click Save.'), cp, cpMsg, det); ol.append(li3);
      var li4 = h('li'); li4.append(h('span', null, 'Click Deploy, then New deployment, then Web app. Set Who has access to Anyone, click Deploy, and allow access.'),
        h('span', 'sp-step-note', 'If Google says the app isn\u2019t verified, click Advanced, then Go to the project. It\u2019s your own script.'));
      ol.append(li4);
      var li5 = h('li'); li5.append(h('span', null, 'Copy the Web app URL and paste it here.'));
      var row = h('div', 'sp-url-row');
      var inp = h('input', 'sp-in'); inp.type = 'url'; inp.placeholder = 'https://script.google.com/macros/s/…/exec'; inp.autocomplete = 'off'; inp.spellcheck = false;
      if (cfg && !cfg.fromCoach) inp.value = cfg.url;
      var go = h('button', 'btn btn-primary', 'Link'); go.type = 'button';
      row.append(inp, go); li5.append(row); ol.append(li5);
      connectHost.append(ol);
      var msg = h('p', 'sp-save-status'); msg.setAttribute('role', 'status'); connectHost.append(msg);
      var after = h('div', 'sp-connect-after'); connectHost.append(after);

      var allLabel = function (n) { return 'Save all ' + n + (n === 1 ? ' logged day' : ' logged days'); };
      var showAfter = function (c) {
        after.replaceChildren();
        if (!c) return;
        var logged = Object.keys(log.days).sort();
        if (logged.length) {
          var all = h('button', 'btn btn-secondary', allLabel(logged.length)); all.type = 'button';
          all.addEventListener('click', function () {
            all.disabled = true; all.textContent = 'Saving…';
            postToGoogle(c.url, { student: data.name || slug, days: logged.map(dayPayload) }).then(function (j) {
              markSaved(logged); msg.className = 'sp-save-status ok';
              msg.textContent = j.unconfirmed ? 'Sent. Open your ' + noun + ' to check.' : '✓ Saved ' + logged.length + (logged.length === 1 ? ' day.' : ' days.');
              if (onTouch) onTouch(selDay);
            }).catch(function (e) { msg.className = 'sp-save-status bad'; msg.textContent = 'Couldn’t save. ' + (e.message || ''); })
              .then(function () { all.disabled = false; all.textContent = allLabel(logged.length); });
          });
          after.append(all);
        }
        if (!c.fromCoach) {
          var un = h('button', 'btn btn-secondary', 'Unlink'); un.type = 'button';
          un.addEventListener('click', function () {
            store.del(KEY + 'sync'); store.del(KEY + 'saved'); inp.value = '';
            msg.className = 'sp-save-status'; msg.textContent = 'Unlinked.'; showAfter(null); if (onTouch) onTouch(selDay);
          });
          after.append(un);
        }
      };
      if (cfg) { msg.className = 'sp-save-status ok'; msg.textContent = '✓ Linked to ' + (cfg.name || (cfg.fromCoach ? 'Caiden’s ' + noun : 'your ' + noun)) + '.'; showAfter(cfg); }

      go.addEventListener('click', function () {
        var u = inp.value.trim();
        if (!validScriptUrl(u)) { msg.className = 'sp-save-status bad'; msg.textContent = 'That isn’t a Web app URL. It starts with https://script.google.com/macros/s/ and ends with /exec.'; return; }
        go.disabled = true; go.textContent = 'Linking…'; msg.className = 'sp-save-status'; msg.textContent = '';
        postToGoogle(u, { ping: true, student: data.name || slug }).then(function (j) {
          var c = { url: u, kind: j.kind || kind, name: j.name || '' };
          store.set(KEY + 'sync', c); store.del(KEY + 'saved');
          msg.className = 'sp-save-status ok';
          msg.textContent = j.unconfirmed ? 'Linked. Google didn’t confirm, so check your ' + noun + ' after your first save.' : '✓ Linked to ' + (c.name || 'your ' + noun) + '.';
          showAfter(c); if (onTouch) onTouch(selDay);
        }).catch(function (e) { msg.className = 'sp-save-status bad'; msg.textContent = 'Couldn’t link. ' + (e.message || ''); })
          .then(function () { go.disabled = false; go.textContent = 'Link'; });
      });
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
        if (practiced(r)) { var n = Object.keys(r.checks || {}).length, size = agendaDrills(r).length || total; lvl = size ? Math.max(1, Math.min(4, Math.ceil(4 * n / size))) : 2; if (!n) lvl = 1; }
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
      var status = histStatus;
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
      acts.append(bk, rs, file);
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

    drawDayBar(); drawAgenda(); drawLog(); drawHistory();

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
