/* Buyout — rules engine + bot AI. Works in the browser (window.Buyout) and in Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Buyout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLS = 12, ROWS = 9, N = COLS * ROWS;
  const EMPTY = -1, LONE = 7, NCH = 7;
  const SAFE = 11, ENDSIZE = 41, MAXSH = 25, HAND = 6, START = 6000;

  const CHAINS = [
    { id: 0, name: 'Pixel',  tier: 0, color: '#ff5d73', ink: '#2a0008', glyph: 'P' },
    { id: 1, name: 'Nimbus', tier: 0, color: '#ffb23e', ink: '#2b1800', glyph: 'N' },
    { id: 2, name: 'Kernel', tier: 1, color: '#f4e04d', ink: '#2a2500', glyph: 'K' },
    { id: 3, name: 'Helix',  tier: 1, color: '#4ade80', ink: '#00210d', glyph: 'H' },
    { id: 4, name: 'Volt',   tier: 1, color: '#38d6f5', ink: '#00222b', glyph: 'V' },
    { id: 5, name: 'Apex',   tier: 2, color: '#7c8cff', ink: '#050a33', glyph: 'A' },
    { id: 6, name: 'Orbit',  tier: 2, color: '#d47bff', ink: '#22003a', glyph: 'O' },
  ];
  const TIER = CHAINS.map(c => c.tier);

  const NB = [];
  for (let i = 0; i < N; i++) {
    const r = (i / COLS) | 0, c = i % COLS, a = [];
    if (r > 0) a.push(i - COLS);
    if (r < ROWS - 1) a.push(i + COLS);
    if (c > 0) a.push(i - 1);
    if (c < COLS - 1) a.push(i + 1);
    NB.push(a);
  }
  const tileName = t => (t % COLS + 1) + 'ABCDEFGHI'[(t / COLS) | 0];

  function rng32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function priceOf(c, size) {
    if (size < 2) return 0;
    let b;
    if (size <= 5) b = size * 100;
    else if (size <= 10) b = 600;
    else if (size <= 20) b = 700;
    else if (size <= 30) b = 800;
    else if (size <= 40) b = 900;
    else b = 1000;
    return b + TIER[c] * 100;
  }
  const price = (s, c) => priceOf(c, s.size[c]);
  const ceil100 = x => Math.ceil(x / 100) * 100;

  /* ---------- state ---------- */
  function newGame(n, seed) {
    const rnd = rng32(seed);
    const bag = []; for (let i = 0; i < N; i++) bag.push(i);
    shuffle(bag, rnd);
    const s = {
      n, board: new Int8Array(N).fill(EMPTY), size: [0, 0, 0, 0, 0, 0, 0], bank: [25, 25, 25, 25, 25, 25, 25],
      cash: [], sh: [], hand: [], bag, turn: 0, turnNo: 0, pending: null, merge: null, over: false, stall: 0, ev: [],
    };
    let first = 0, best = 1e9; const draws = [];
    for (let p = 0; p < n; p++) {
      s.cash.push(START); s.sh.push([0, 0, 0, 0, 0, 0, 0]); s.hand.push([]);
      const t = bag.pop(); s.board[t] = LONE; draws.push(t);
      const key = (t % COLS) * 100 + ((t / COLS) | 0);
      if (key < best) { best = key; first = p; }
    }
    for (let p = 0; p < n; p++) for (let i = 0; i < HAND; i++) s.hand[p].push(bag.pop());
    s.turn = first;
    s.ev.push({ e: 'setup', draws, first });
    startTurn(s);
    return s;
  }

  function clone(s) {
    return {
      n: s.n, board: s.board.slice(), size: s.size.slice(), bank: s.bank.slice(), cash: s.cash.slice(),
      sh: s.sh.map(a => a.slice()), hand: s.hand.map(a => a.slice()), bag: s.bag.slice(),
      turn: s.turn, turnNo: s.turnNo, pending: s.pending,
      merge: s.merge ? Object.assign({}, s.merge, { defuncts: s.merge.defuncts.slice(), queue: s.merge.queue.slice() }) : null,
      over: s.over, stall: s.stall, ev: null,
    };
  }

  function tileInfo(s, t) {
    const b = s.board, chains = []; let lone = false;
    const nb = NB[t];
    for (let i = 0; i < nb.length; i++) {
      const v = b[nb[i]];
      if (v === LONE) lone = true;
      else if (v >= 0 && chains.indexOf(v) < 0) chains.push(v);
    }
    if (chains.length === 0) {
      if (!lone) return { k: 'plain', chains };
      for (let c = 0; c < NCH; c++) if (s.size[c] === 0) return { k: 'found', chains };
      return { k: 'blocked', chains };
    }
    if (chains.length === 1) return { k: 'grow', chains };
    let safe = 0;
    for (let i = 0; i < chains.length; i++) if (s.size[chains[i]] >= SAFE) safe++;
    return { k: safe >= 2 ? 'dead' : 'merge', chains };
  }
  const playable = k => k !== 'dead' && k !== 'blocked';

  function absorb(s, t, c) {
    const b = s.board, st = [t]; b[t] = c; let add = 1;
    while (st.length) {
      const x = st.pop(), nb = NB[x];
      for (let i = 0; i < nb.length; i++) { const y = nb[i]; if (b[y] === LONE) { b[y] = c; add++; st.push(y); } }
    }
    s.size[c] += add; return add;
  }
  /* how many tiles a placement adds to a chain (tile + connected lone tiles) */
  function growCount(s, t) {
    const b = s.board, seen = [t], st = [t];
    while (st.length) {
      const x = st.pop(), nb = NB[x];
      for (let i = 0; i < nb.length; i++) { const y = nb[i]; if (b[y] === LONE && seen.indexOf(y) < 0) { seen.push(y); st.push(y); } }
    }
    return seen.length;
  }

  /* what player p would get if chain c paid its bonus now at price pr, with p holding delta extra shares */
  function bonusFor(s, c, p, delta, pr) {
    const mine = s.sh[p][c] + delta;
    if (mine <= 0) return 0;
    let first = mine, nFirst = 0, second = 0, nSecond = 0;
    for (let q = 0; q < s.n; q++) { const h = q === p ? mine : s.sh[q][c]; if (h > first) first = h; }
    for (let q = 0; q < s.n; q++) {
      const h = q === p ? mine : s.sh[q][c];
      if (h === first) nFirst++; else if (h > second) second = h;
    }
    if (second > 0) for (let q = 0; q < s.n; q++) { const h = q === p ? mine : s.sh[q][c]; if (h === second) nSecond++; }
    const maj = pr * 10, min = pr * 5;
    if (mine === first) {
      if (nFirst > 1) return ceil100((maj + min) / nFirst);
      return second > 0 ? maj : maj + min;
    }
    if (nFirst > 1) return 0;
    if (mine === second) return ceil100(min / nSecond);
    return 0;
  }
  function payBonuses(s, c, pr, why) {
    const pays = [];
    for (let p = 0; p < s.n; p++) { const b = bonusFor(s, c, p, 0, pr); if (b > 0) pays.push([p, b, s.sh[p][c]]); }
    for (const [p, b] of pays) s.cash[p] += b;
    if (s.ev) s.ev.push({ e: 'bonus', chain: c, price: pr, pays, why });
  }

  function endAvailable(s) {
    let active = 0, allSafe = true;
    for (let c = 0; c < NCH; c++) {
      const z = s.size[c]; if (z === 0) continue;
      if (z >= ENDSIZE) return true;
      active++; if (z < SAFE) allSafe = false;
    }
    return active > 0 && allSafe;
  }

  function startTurn(s) {
    const p = s.turn, h = s.hand[p]; let ok = false;
    for (let i = 0; i < h.length; i++) if (playable(tileInfo(s, h[i]).k)) { ok = true; break; }
    if (s.ev) s.ev.push({ e: 'turn', player: p });
    if (ok) { s.stall = 0; s.pending = { type: 'place', player: p }; return; }
    s.stall++;
    if (s.ev) s.ev.push({ e: 'pass', player: p });
    if (s.stall >= s.n) { finish(s, 'stuck'); return; }
    goBuy(s);
  }
  function goBuy(s) { s.pending = { type: 'buy', player: s.turn, canEnd: endAvailable(s) }; }

  function endTurn(s) {
    const p = s.turn, h = s.hand[p];
    while (h.length < HAND && s.bag.length) { const t = s.bag.pop(); h.push(t); if (s.ev) s.ev.push({ e: 'draw', player: p, tile: t }); }
    for (let guard = 0; guard < 30; guard++) {
      let swapped = false;
      for (let i = h.length - 1; i >= 0; i--) {
        if (tileInfo(s, h[i]).k === 'dead') {
          const dead = h[i]; h.splice(i, 1); swapped = true;
          let nt = -1; if (s.bag.length) { nt = s.bag.pop(); h.push(nt); }
          if (s.ev) s.ev.push({ e: 'swap', player: p, dead, tile: nt });
        }
      }
      if (!swapped) break;
    }
    s.turn = (p + 1) % s.n; s.turnNo++;
    if (s.turnNo > 500) { finish(s, 'limit'); return; }
    startTurn(s);
  }

  function finish(s, why) {
    if (s.ev) s.ev.push({ e: 'end', why });
    for (let c = 0; c < NCH; c++) {
      if (s.size[c] === 0) continue;
      const pr = price(s, c);
      payBonuses(s, c, pr, 'final');
      const sales = [];
      for (let p = 0; p < s.n; p++) { const k = s.sh[p][c]; if (k) { s.cash[p] += k * pr; sales.push([p, k, k * pr]); s.bank[c] += k; s.sh[p][c] = 0; } }
      if (s.ev) s.ev.push({ e: 'liquidate', chain: c, price: pr, sales });
    }
    s.over = true; s.pending = null; s.merge = null;
  }

  function nextDefunct(s) {
    const m = s.merge;
    if (m.idx >= m.defuncts.length) {
      const b = s.board;
      for (let i = 0; i < N; i++) { const v = b[i]; if (v >= 0 && v !== LONE && v !== m.survivor && m.defuncts.indexOf(v) >= 0) b[i] = m.survivor; }
      for (const d of m.defuncts) { s.size[m.survivor] += s.size[d]; s.size[d] = 0; }
      absorb(s, m.tile, m.survivor);
      if (s.ev) s.ev.push({ e: 'merged', survivor: m.survivor, defuncts: m.defuncts.slice(), size: s.size[m.survivor], tile: m.tile });
      s.merge = null; goBuy(s); return;
    }
    const d = m.defuncts[m.idx];
    m.dprice = price(s, d);
    payBonuses(s, d, m.dprice, 'merger');
    m.queue = [];
    for (let i = 0; i < s.n; i++) { const p = (m.maker + i) % s.n; if (s.sh[p][d] > 0) m.queue.push(p); }
    nextDispose(s);
  }
  function nextDispose(s) {
    const m = s.merge;
    if (!m.queue.length) { m.idx++; nextDefunct(s); return; }
    s.pending = { type: 'dispose', player: m.queue.shift(), defunct: m.defuncts[m.idx], survivor: m.survivor, dprice: m.dprice };
  }
  function startMerge(s, tile, chains, survivor, maker) {
    const defuncts = chains.filter(c => c !== survivor).sort((a, b) => s.size[b] - s.size[a] || b - a);
    s.merge = { tile, survivor, defuncts, idx: 0, maker, queue: [], dprice: 0 };
    if (s.ev) s.ev.push({ e: 'merge', survivor, defuncts: defuncts.slice(), tile, player: maker, sizes: s.size.slice() });
    nextDefunct(s);
  }

  function apply(s, a) {
    const pd = s.pending, p = pd.player;
    switch (pd.type) {
      case 'place': {
        const t = a.tile, h = s.hand[p], i = h.indexOf(t);
        if (i < 0) throw new Error('tile not in hand');
        const info = tileInfo(s, t);
        if (!playable(info.k)) throw new Error('unplayable tile');
        h.splice(i, 1); s.board[t] = LONE;
        if (s.ev) s.ev.push({ e: 'place', player: p, tile: t, kind: info.k });
        if (info.k === 'plain') goBuy(s);
        else if (info.k === 'found') s.pending = { type: 'found', player: p, tile: t };
        else if (info.k === 'grow') {
          const c = info.chains[0], add = absorb(s, t, c);
          if (s.ev) s.ev.push({ e: 'grow', chain: c, size: s.size[c], add, tile: t });
          goBuy(s);
        } else {
          let mx = 0; for (const c of info.chains) if (s.size[c] > mx) mx = s.size[c];
          const tops = info.chains.filter(c => s.size[c] === mx);
          if (tops.length > 1) s.pending = { type: 'survivor', player: p, tile: t, options: tops, chains: info.chains };
          else startMerge(s, t, info.chains, tops[0], p);
        }
        break;
      }
      case 'found': {
        const c = a.chain; if (s.size[c] !== 0) throw new Error('chain active');
        absorb(s, pd.tile, c);
        let free = 0; if (s.bank[c] > 0) { s.bank[c]--; s.sh[p][c]++; free = 1; }
        if (s.ev) s.ev.push({ e: 'found', player: p, chain: c, size: s.size[c], free, tile: pd.tile });
        goBuy(s); break;
      }
      case 'survivor': {
        if (pd.options.indexOf(a.chain) < 0) throw new Error('bad survivor');
        startMerge(s, pd.tile, pd.chains, a.chain, p); break;
      }
      case 'dispose': {
        const d = pd.defunct, sv = pd.survivor, k = s.sh[p][d];
        const sell = a.sell | 0, trade = a.trade | 0;
        if (sell < 0 || trade < 0 || trade % 2 || sell + trade > k || trade / 2 > s.bank[sv]) throw new Error('bad dispose');
        s.sh[p][d] -= sell + trade; s.bank[d] += sell + trade; s.cash[p] += sell * pd.dprice;
        s.sh[p][sv] += trade / 2; s.bank[sv] -= trade / 2;
        if (s.ev) s.ev.push({ e: 'dispose', player: p, defunct: d, survivor: sv, sell, trade, keep: k - sell - trade, price: pd.dprice });
        nextDispose(s); break;
      }
      case 'buy': {
        const buys = a.buys || []; if (buys.length > 3) throw new Error('too many');
        let cost = 0;
        for (const c of buys) {
          const pr = price(s, c);
          if (!pr || s.bank[c] <= 0 || s.cash[p] < pr) throw new Error('bad buy');
          s.cash[p] -= pr; s.bank[c]--; s.sh[p][c]++; cost += pr;
        }
        if (s.ev) s.ev.push({ e: 'buy', player: p, buys: buys.slice(), cost });
        if (a.end && pd.canEnd) finish(s, 'declared'); else endTurn(s);
        break;
      }
    }
    return s;
  }

  function netWorth(s, p) {
    let v = s.cash[p];
    for (let c = 0; c < NCH; c++) {
      if (s.size[c] === 0) continue;
      const pr = price(s, c);
      v += s.sh[p][c] * pr + bonusFor(s, c, p, 0, pr);
    }
    return v;
  }

  /* ---------- heuristic policy (also the rollout policy) ---------- */
  function maxOther(s, p, c) { let m = 0; for (let q = 0; q < s.n; q++) if (q !== p && s.sh[q][c] > m) m = s.sh[q][c]; return m; }

  function growValue(s, p, c, after) {
    const before = s.size[c], p0 = priceOf(c, before), p1 = priceOf(c, after);
    let mine = 0, worst = 0;
    if (p1 !== p0) {
      for (let q = 0; q < s.n; q++) {
        if (!s.sh[q][c]) continue;
        const dv = s.sh[q][c] * (p1 - p0) + bonusFor(s, c, q, 0, p1) - bonusFor(s, c, q, 0, p0);
        if (q === p) mine = dv; else if (dv > worst) worst = dv;
      }
    }
    let v = mine - 0.4 * worst;
    if (before < SAFE && after >= SAFE) v += s.sh[p][c] >= maxOther(s, p, c) && s.sh[p][c] > 0 ? 150 : -150;
    if (s.sh[p][c] > 0) v += 30;
    return v;
  }
  function mergeValue(s, p, chains, survivor) {
    let v = 150;
    for (const d of chains) {
      if (d === survivor) continue;
      const pr = price(s, d); let worst = 0;
      for (let q = 0; q < s.n; q++) { if (q === p) continue; const b = bonusFor(s, d, q, 0, pr); if (b > worst) worst = b; }
      v += bonusFor(s, d, p, 0, pr) + s.sh[p][d] * pr * 0.25 - 0.4 * worst;
    }
    return v;
  }
  function pickSurvivor(s, p, chains, options) {
    let best = options[0], bv = -1e9;
    for (const o of options) { const v = mergeValue(s, p, chains, o) + s.sh[p][o] * 40; if (v > bv) { bv = v; best = o; } }
    return best;
  }
  function scorePlace(s, p, t, info) {
    switch (info.k) {
      case 'found': return 520 + (s.cash[p] < 700 ? 250 : 0);
      case 'grow': return growValue(s, p, info.chains[0], s.size[info.chains[0]] + growCount(s, t));
      case 'merge': {
        let mx = 0; for (const c of info.chains) if (s.size[c] > mx) mx = s.size[c];
        const tops = info.chains.filter(c => s.size[c] === mx);
        return mergeValue(s, p, info.chains, tops.length > 1 ? pickSurvivor(s, p, info.chains, tops) : tops[0]);
      }
      default: return 0;
    }
  }
  function scoreFound(s, p, c) {
    let others = 0; for (let q = 0; q < s.n; q++) if (q !== p) others += s.sh[q][c];
    return s.sh[p][c] * 160 + TIER[c] * 45 - others * 90;
  }
  function scoreBuy(s, p, c, extra, cash) {
    const pr = price(s, c), z = s.size[c];
    const mine = s.sh[p][c] + extra, lead = maxOther(s, p, c);
    const dB = bonusFor(s, c, p, extra + 1, pr) - bonusFor(s, c, p, extra, pr);
    const growth = z < SAFE ? 160 : z < ENDSIZE ? 70 : 0;
    const gap = lead - mine; let chase = 0;
    if (gap >= 2 && gap <= 3) chase = pr * 1.6;
    else if (mine > 0 && gap <= 0 && gap >= -1) chase = pr * 1.4;
    else if (mine === 0 && lead === 0) chase = pr * 2;
    const left = cash - pr;
    return dB * (z < SAFE ? 1.15 : 1) + growth + chase - pr * (left < 800 ? 0.3 : 0.06);
  }
  function policyBuys(s, p, rnd, noise) {
    const buys = [], extra = [0, 0, 0, 0, 0, 0, 0]; let cash = s.cash[p];
    for (let k = 0; k < 3; k++) {
      let best = -1, bv = 110;
      for (let c = 0; c < NCH; c++) {
        if (s.size[c] === 0 || s.bank[c] - extra[c] <= 0) continue;
        const pr = price(s, c); if (pr > cash) continue;
        const v = scoreBuy(s, p, c, extra[c], cash) + rnd() * noise;
        if (v > bv) { bv = v; best = c; }
      }
      if (best < 0) break;
      buys.push(best); extra[best]++; cash -= price(s, best);
    }
    return buys;
  }
  function policyDispose(s, p, pd, rnd) {
    const d = pd.defunct, sv = pd.survivor, k = s.sh[p][d];
    let newSize = s.size[sv]; for (const x of s.merge.defuncts) newSize += s.size[x];
    const sp = priceOf(sv, newSize + 1);
    let trade = 0, keep = 0;
    const maxTrade = Math.min(k - (k % 2), s.bank[sv] * 2);
    const lead = maxOther(s, p, sv), mineSv = s.sh[p][sv];
    const helps = mineSv + maxTrade / 2 >= lead && mineSv <= lead + 1 && maxTrade > 0;
    if (sp / 2 >= pd.dprice || (helps && sp / 2 >= pd.dprice * 0.7)) trade = maxTrade;
    const rest = k - trade;
    const early = s.bag.length > 35;
    if (rest > 0 && early && s.cash[p] > 2500 && rnd() < 0.5) keep = rest;
    return { sell: rest - keep, trade };
  }
  function wouldWin(s, p) {
    const mine = netWorth(s, p);
    for (let q = 0; q < s.n; q++) if (q !== p && netWorth(s, q) >= mine) return false;
    return true;
  }
  /* noise: size of the random term added to scores. ~250 for rollouts, larger = weaker play */
  function policy(s, rnd, noise) {
    const pd = s.pending, p = pd.player;
    switch (pd.type) {
      case 'place': {
        const h = s.hand[p]; let best = -1, bv = -1e9;
        for (let i = 0; i < h.length; i++) {
          const info = tileInfo(s, h[i]); if (!playable(info.k)) continue;
          const v = scorePlace(s, p, h[i], info) + rnd() * noise;
          if (v > bv) { bv = v; best = h[i]; }
        }
        return { tile: best };
      }
      case 'found': {
        let best = -1, bv = -1e9;
        for (let c = 0; c < NCH; c++) { if (s.size[c]) continue; const v = scoreFound(s, p, c) + rnd() * noise * 0.5; if (v > bv) { bv = v; best = c; } }
        return { chain: best };
      }
      case 'survivor': return { chain: pickSurvivor(s, p, pd.chains, pd.options) };
      case 'dispose': return policyDispose(s, p, pd, rnd);
      case 'buy': {
        if (pd.canEnd && (wouldWin(s, p) || s.bag.length === 0)) return { buys: [], end: true };
        return { buys: policyBuys(s, p, rnd, noise) };
      }
    }
  }

  /* ---------- Monte Carlo search ---------- */
  function determinize(s, me, rnd) {
    const d = clone(s), pool = d.bag.slice();
    for (let q = 0; q < d.n; q++) if (q !== me) for (const t of d.hand[q]) pool.push(t);
    shuffle(pool, rnd);
    for (let q = 0; q < d.n; q++) if (q !== me) { const k = d.hand[q].length; d.hand[q] = pool.splice(pool.length - k, k); }
    d.bag = pool;
    return d;
  }
  function playout(s, rnd, me, maxTurns) {
    const stop = s.turnNo + maxTurns;
    while (!s.over && s.turnNo < stop) apply(s, policy(s, rnd, 250));
    let mine, best = -1e9;
    for (let q = 0; q < s.n; q++) { const v = s.over ? s.cash[q] : netWorth(s, q); if (q === me) mine = v; else if (v > best) best = v; }
    const margin = mine - best;
    return { win: margin > 0 ? 1 : margin === 0 ? 0.5 : 0, margin };
  }
  const blend = r => 0.5 * r.win + 0.5 * (0.5 + 0.5 * Math.tanh(r.margin / 9000));

  function sameAction(a, b) {
    if (a.tile !== b.tile || a.chain !== b.chain || !!a.end !== !!b.end || (a.sell | 0) !== (b.sell | 0) || (a.trade | 0) !== (b.trade | 0)) return false;
    const x = (a.buys || []).slice().sort(), y = (b.buys || []).slice().sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }

  function candidates(s, wide) {
    const pd = s.pending, p = pd.player, out = [];
    switch (pd.type) {
      case 'place':
        for (const t of s.hand[p]) if (playable(tileInfo(s, t).k)) out.push({ tile: t });
        break;
      case 'found': {
        const seen = {};
        for (let c = 0; c < NCH; c++) {
          if (s.size[c]) continue;
          const key = TIER[c] + ':' + s.sh.map(h => h[c]).join(',');
          if (seen[key] && !wide) continue; seen[key] = 1; out.push({ chain: c });
        }
        break;
      }
      case 'survivor': for (const c of pd.options) out.push({ chain: c }); break;
      case 'dispose': {
        const k = s.sh[p][pd.defunct], mt = Math.min(k - (k % 2), s.bank[pd.survivor] * 2);
        const add = (sell, trade) => { const a = { sell, trade }; if (sell >= 0 && !out.some(o => sameAction(o, a))) out.push(a); };
        add(k, 0); add(0, 0); add(k - mt, mt); add(0, mt);
        const half = (k >> 1); add(half, 0);
        const ht = Math.min(mt, half - (half % 2)); if (ht > 0) { add(k - ht, ht); add(0, ht); }
        break;
      }
      case 'buy': {
        const sc = [];
        for (let c = 0; c < NCH; c++) if (s.size[c] && s.bank[c] > 0 && price(s, c) <= s.cash[p]) sc.push([scoreBuy(s, p, c, 0, s.cash[p]), c]);
        sc.sort((a, b) => b[0] - a[0]);
        const top = sc.slice(0, wide ? 4 : 3).map(x => x[1]);
        const rec = (start, cur, cash) => {
          out.push({ buys: cur.slice() });
          if (cur.length === 3) return;
          for (let i = start; i < top.length; i++) {
            const c = top[i], pr = price(s, c);
            if (pr > cash || cur.filter(x => x === c).length >= s.bank[c]) continue;
            cur.push(c); rec(i, cur, cash - pr); cur.pop();
          }
        };
        rec(0, [], s.cash[p]);
        if (pd.canEnd) out.push({ buys: [], end: true });
        break;
      }
    }
    return out;
  }

  class Analysis {
    constructor(s, opts) {
      opts = opts || {};
      this.s = clone(s); this.me = s.pending.player; this.type = s.pending.type;
      this.seed = (opts.seed || 1) | 0; this.depth = opts.depth || 12; this.prune = !!opts.prune; this.dollars = opts.metric === 'margin';
      this.c = candidates(this.s, !!opts.wide).map(a => this._mk(a));
      this.rounds = 0;
    }
    _mk(a) { return { a, sc: [], sum: 0, win: 0, margin: 0, alive: true }; }
    _eval(c, r) {
      const rnd = rng32(this.seed + r * 7919);
      const d = determinize(this.s, this.me, rnd);
      apply(d, c.a);
      const res = playout(d, rnd, this.me, this.depth), v = this.dollars ? res.margin : blend(res);
      c.sc.push(v); c.sum += v; c.win += res.win; c.margin += res.margin;
    }
    step() {
      const r = this.rounds;
      for (const c of this.c) if (c.alive && c.sc.length === r) this._eval(c, r);
      this.rounds++;
      if (this.prune && (this.rounds === 6 || this.rounds === 16 || this.rounds === 40)) {
        const alive = this.c.filter(c => c.alive).sort((a, b) => b.sum - a.sum);
        const keep = Math.max(3, Math.ceil(alive.length / 2));
        for (let i = keep; i < alive.length; i++) alive[i].alive = false;
      }
    }
    runFor(ms, maxRounds) {
      if (this.c.length <= 1 && this.rounds >= 1) return;
      const t0 = Date.now();
      do { this.step(); } while (Date.now() - t0 < ms && this.rounds < (maxRounds || 1e9));
    }
    /* make sure an arbitrary action is scored on the same rounds as the leader */
    ensure(a) {
      let c = this.c.find(x => sameAction(x.a, a));
      if (!c) { c = this._mk(a); c.alive = false; c.extra = true; this.c.push(c); }
      const lead = this.best();
      const target = lead ? lead.sc.length : this.rounds;
      while (c.sc.length < target) this._eval(c, c.sc.length);
      return c;
    }
    mean(c, n) {
      n = Math.min(n || c.sc.length, c.sc.length); if (!n) return 0;
      if (n === c.sc.length) return c.sum / n;
      let t = 0; for (let i = 0; i < n; i++) t += c.sc[i]; return t / n;
    }
    best() {
      let b = null, bn = -1;
      for (const c of this.c) { if (c.sc.length > bn) bn = c.sc.length; }
      for (const c of this.c) if (c.sc.length === bn && (!b || c.sum > b.sum)) b = c;
      return b;
    }
    ranked() {
      return this.c.filter(c => c.sc.length).map(c => ({
        a: c.a, n: c.sc.length, score: c.sum / c.sc.length, win: c.win / c.sc.length, margin: c.margin / c.sc.length,
      })).sort((x, y) => (y.n >= 6) - (x.n >= 6) || y.score - x.score);
    }
  }

  /* ---------- bot levels ---------- */
  const LEVELS = {
    intern:  { name: 'Intern',  mc: 0, noise: 1100 },
    founder: { name: 'Founder', mc: 60, maxRounds: 5, noise: 0 },
    shark:   { name: 'Shark',   mc: 220, noise: 0 },
    titan:   { name: 'Titan',   mc: 800, noise: 0 },
  };
  /* synchronous bot move (used in tests); UI uses Analysis directly so it can yield */
  function botMove(s, level, rnd, budgetMs) {
    const L = LEVELS[level];
    if (!L.mc) return policy(s, rnd, L.noise);
    const an = new Analysis(s, { seed: (rnd() * 1e9) | 0, prune: true });
    if (an.c.length === 1) return an.c[0].a;
    an.runFor(budgetMs || L.mc, L.maxRounds);
    return an.best().a;
  }

  return {
    COLS, ROWS, N, EMPTY, LONE, NCH, SAFE, ENDSIZE, MAXSH, HAND, START, CHAINS, TIER, NB,
    tileName, rng32, priceOf, price, newGame, clone, tileInfo, playable, growCount, bonusFor, endAvailable,
    apply, netWorth, policy, candidates, sameAction, Analysis, LEVELS, botMove, maxOther,
  };
});
