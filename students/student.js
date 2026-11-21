/* Student Pages template.
   Every page at /students/<name>/ loads this file. It reads /students/<name>.json
   and builds the page from it. To add a student or a session, edit data files only.
   See /students/_sample.json for the data format. */
(function () {
  'use strict';

  var COACHING_URL = 'https://caidenlee.com/#coaching';
  var TAB_COLORS = ['var(--cube-b)', 'var(--cube-g)', 'var(--cube-y)', 'var(--cube-o)', 'var(--cube-r)'];
  var ICON = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>',
    fix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>',
    drill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9"/></svg>',
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
  function asItem(x) { return typeof x === 'string' ? { text: x } : (x && typeof x === 'object' ? x : { text: String(x) }); }
  function list(x) { return Array.isArray(x) ? x : []; }
  // Data files may contain full-line // comments (see _sample.json). Strip them before parsing.
  function parseData(txt) {
    return JSON.parse(txt.split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n'));
  }

  // ---------- which student ----------
  var parts = location.pathname.split('/').filter(Boolean);
  var i = parts.indexOf('students');
  var slug = (i >= 0 && parts[i + 1]) ? decodeURIComponent(parts[i + 1]).toLowerCase().replace(/\.html$/, '') : '';
  if (slug === 'index') slug = '';
  if (!/^[a-z0-9-]+$/.test(slug)) slug = '';
  var KEY = 'cl-student:' + slug + ':';

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
      if (!sessions.length) { message('No notes yet', 'Your first session notes will show up here.'); return; }
      document.title = (data.name || 'Student') + ' | Coaching Notes';
      window.addEventListener('hashchange', render);
      window.addEventListener('popstate', render);
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
    head.append(h('div', 'section-label', 'Coaching Notes'), h('h1', 'sp-name', data.name || 'Student'));
    var meta = h('div', 'sp-meta');
    var c1 = h('span', 'sp-chip'); c1.append(svg(ICON.cal), h('b', null, fmtDate(s.date)));
    var c2 = h('span', 'sp-chip'); c2.append(svg(ICON.coach), 'Coach: ', h('b', null, s.coach || data.coach || 'Caiden Lee'));
    meta.append(c1, c2); head.append(meta); main.append(head);

    if (!latest) {
      var past = rv(h('div', 'sp-past'));
      past.append(h('span', null, 'You’re viewing a past session.'));
      var lb = h('button', 'btn btn-secondary', 'Back to latest'); lb.type = 'button';
      lb.addEventListener('click', function () { goSession(sessions[0].id); });
      past.append(lb); main.append(past);
    }

    // stats
    var stats = list(s.stats);
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

    // tabs
    var tabs = list(s.tabs);
    var checks = store.get(KEY + s.id) || {};
    var total = 0;
    tabs.forEach(function (t) { total += list(t.practice).length; });
    var barFill, barNote;

    function doneCount() { var n = 0; Object.keys(checks).forEach(function (k) { if (checks[k]) n++; }); return n; }
    function updateProgress() {
      var n = doneCount();
      if (barFill) barFill.style.width = total ? (100 * n / total) + '%' : '0';
      if (barNote) barNote.textContent = n === total && total ? 'All drills done today. Nice work!' : n + ' of ' + total + ' drills done today';
    }

    if (tabs.length) {
      var wrap = rv(h('section'));
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

      function drawTab() {
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

        var pr = list(t.practice);
        if (pr.length) {
          var pc = h('div', 'sp-card');
          var ph = h('div', 'sp-card-h'); var h2b = h('h2'); var ic2 = h('span', 'ic'); ic2.append(svg(ICON.drill)); h2b.append(ic2, 'How to Practice');
          var cnt = h('span', 'sp-count'); ph.append(h2b, cnt); pc.append(ph);
          var ol = h('ul', 'sp-check');
          var tabCount = function () {
            var n = 0; pr.forEach(function (_, pi) { if (checks[active + '-' + pi]) n++; });
            cnt.textContent = n + ' / ' + pr.length; cnt.className = 'sp-count' + (n === pr.length ? ' done' : '');
          };
          pr.forEach(function (raw, pi) {
            var it = asItem(raw), id = active + '-' + pi;
            var li = h('li', 'sp-item' + (checks[id] ? ' on' : ''));
            var lab = h('label'); var inp = h('input'); inp.type = 'checkbox'; inp.checked = !!checks[id];
            var box = h('span', 'sp-box'); box.append(svg(ICON.check));
            var txt = h('span', 'sp-item-text', it.text || '');
            if (it.note) txt.append(h('span', 'sp-item-note', it.note));
            lab.append(inp, box, txt);
            inp.addEventListener('change', function () {
              if (inp.checked) checks[id] = true; else delete checks[id];
              li.classList.toggle('on', inp.checked);
              store.set(KEY + s.id, checks); tabCount(); updateProgress();
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
        if (!fix.length && !pr.length) panel.append(h('div', 'sp-card', 'Nothing here this session.'));
        panelHost.replaceChildren(panel);
      }

      wrap.append(bar, panelHost);
      if (total) {
        var prog = h('div', 'sp-progress'); barFill = h('i'); prog.append(barFill);
        var row = h('div', 'sp-reset-row'); barNote = h('span', 'note');
        var rb = h('button', 'btn btn-secondary', 'Reset for today'); rb.type = 'button';
        rb.addEventListener('click', function () { checks = {}; store.del(KEY + s.id); drawTab(); updateProgress(); });
        row.append(barNote, rb);
        wrap.append(prog, row);
      }
      main.append(wrap);
      drawTab(); updateProgress();
    }

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
