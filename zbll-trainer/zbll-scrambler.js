// ZBLL Random-State Scrambler
// Adapted from csTimer (https://github.com/cs0x7f/cstimer) — MIT License
// Uses min2phase (Kociemba two-phase solver) + mathlib from csTimer

var zbllScrambler = (function(getNPerm, setNPerm, getNParity, setNOri, getNOri, rn, rndEl) {

	var Ux1 = 0, Ux2 = 1, Ux3 = 2,
	    Rx1 = 3, Rx2 = 4, Rx3 = 5,
	    Fx1 = 6, Fx2 = 7, Fx3 = 8,
	    Dx1 = 9, Dx2 = 10, Dx3 = 11,
	    Lx1 = 12, Lx2 = 13, Lx3 = 14,
	    Bx1 = 15, Bx2 = 16, Bx3 = 17;

	var search = null;
	var initialized = false;
	var initCallbacks = [];

	function ensureInit() {
		if (!initialized) {
			search = new min2phase.Search();
			initialized = true;
			for (var i = 0; i < initCallbacks.length; i++) initCallbacks[i]();
			initCallbacks = [];
		}
	}

	// Called on page load to warm up the solver in background
	function init(callback) {
		setTimeout(function() {
			ensureInit();
			if (callback) callback();
		}, 0);
	}

	function onReady(callback) {
		if (initialized) { callback(); } else { initCallbacks.push(callback); }
	}

	// ── helpers from scramble_333_edit.js ──

	function renderFacelet(solved, cc, resultMap) {
		var f = cc.toPerm();
		var ret = [];
		for (var i = 0; i < resultMap.length; i++) {
			ret[i] = solved[f[resultMap[i]]];
		}
		return ret.join('');
	}

	function cntU(b) {
		for (var c = 0, a = 0; a < b.length; a++) -1 == b[a] && c++;
		return c;
	}

	function fixOri(arr, cntU, base) {
		var sum = 0, idx = 0;
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] != -1) sum += arr[i];
		}
		sum %= base;
		for (var i = 0; i < arr.length - 1; i++) {
			if (arr[i] == -1) {
				if (cntU-- == 1) { arr[i] = ((base << 4) - sum) % base; }
				else { arr[i] = rn(base); sum += arr[i]; }
			}
			idx *= base; idx += arr[i];
		}
		if (cntU == 1) arr.splice(-1, 1, ((base << 4) - sum) % base);
		return idx;
	}

	function fixPerm(arr, cntU, parity) {
		var val = [0,1,2,3,4,5,6,7,8,9,10,11];
		for (var i = 0; i < arr.length; i++) { if (arr[i] != -1) val[arr[i]] = -1; }
		for (var i = 0, j = 0; i < val.length; i++) { if (val[i] != -1) val[j++] = val[i]; }
		var last;
		for (var i = 0; i < arr.length && cntU > 0; i++) {
			if (arr[i] == -1) {
				var r = rn(cntU); arr[i] = val[r];
				for (var j = r; j < 11; j++) val[j] = val[j+1];
				if (cntU-- == 2) last = i;
			}
		}
		if (getNParity(getNPerm(arr, arr.length), arr.length) == 1 - parity) {
			var temp = arr[i-1]; arr[i-1] = arr[last]; arr[last] = temp;
		}
		return getNPerm(arr, arr.length);
	}

	function parseMask(arr, length) {
		if ('number' !== typeof arr) return arr;
		var ret = [];
		for (var i = 0; i < length; i++) {
			var val = arr & 0xf;
			ret[i] = val == 15 ? -1 : val;
			arr /= 16;
		}
		return ret;
	}

	var aufsuff = [[], [Ux1], [Ux2], [Ux3]];
	var emptysuff = [[]];

	function getAnyScramble(_ep, _eo, _cp, _co, neut, _rndapp, _rndpre) {
		if (!initialized) return null;
		_rndapp = _rndapp || emptysuff;
		_rndpre = _rndpre || emptysuff;
		_ep = parseMask(_ep, 12);
		_eo = parseMask(_eo, 12);
		_cp = parseMask(_cp, 8);
		_co = parseMask(_co, 8);
		var solution = "";
		var attempts = 0;
		do {
			if (++attempts > 20) return null;
			var eo = _eo.slice(), ep = _ep.slice(), co = _co.slice(), cp = _cp.slice();
			var neo = fixOri(eo, cntU(eo), 2);
			var nco = fixOri(co, cntU(co), 3);
			var nep, ncp;
			var ue = cntU(ep), uc = cntU(cp);
			if (ue == 1) { fixPerm(ep, ue, -1); ue = 0; }
			if (uc == 1) { fixPerm(cp, uc, -1); uc = 0; }
			if (ue == 0 && uc == 0) { nep = getNPerm(ep, 12); ncp = getNPerm(cp, 8); }
			else if (ue != 0 && uc == 0) { ncp = getNPerm(cp, 8); nep = fixPerm(ep, ue, getNParity(ncp, 8)); }
			else if (ue == 0 && uc != 0) { nep = getNPerm(ep, 12); ncp = fixPerm(cp, uc, getNParity(nep, 12)); }
			else { nep = fixPerm(ep, ue, -1); ncp = fixPerm(cp, uc, getNParity(nep, 12)); }
			if (ncp + nco + nep + neo == 0) continue;
			var rndpre = rndEl(_rndpre), rndapp = rndEl(_rndapp);
			var cc = new mathlib.CubieCube(), cd = new mathlib.CubieCube();
			for (var i = 0; i < 12; i++) {
				cc.ea[i] = ep[i] << 1 | eo[i];
				if (i < 8) cc.ca[i] = co[i] << 3 | cp[i];
			}
			for (var i = 0; i < rndpre.length; i++) {
				mathlib.CubieCube.CubeMult(mathlib.CubieCube.moveCube[rndpre[i]], cc, cd);
				cc.init(cd.ca, cd.ea);
			}
			for (var i = 0; i < rndapp.length; i++) {
				mathlib.CubieCube.CubeMult(cc, mathlib.CubieCube.moveCube[rndapp[i]], cd);
				cc.init(cd.ca, cd.ea);
			}
			var posit = cc.toFaceCube();
			solution = search.solution(posit, 21, 1e9, 50, 2);
		} while (!solution || solution.length <= 3);
		return solution.replace(/ +/g, ' ').trim();
	}

	// ── Build ZBLL case map (same as csTimer genZBLLMap) ──

	function genZBLLMap() {
		var isVisited = [], zbll_map = [];
		var cc = new mathlib.CubieCube();
		for (var idx = 0; idx < 27 * 24 * 24; idx++) {
			if (isVisited[idx >> 5] >> (idx & 0x1f) & 1) continue;
			var epi = idx % 24;
			var cpi = ~~(idx / 24) % 24;
			var coi = ~~(idx / 24 / 24);
			if (getNParity(cpi, 4) != getNParity(epi, 4)) continue;
			var co = setNOri([], coi, 4, -3);
			var cp = setNPerm([], cpi, 4, 0);
			var ep = setNPerm([], epi, 4, 0);
			var zbcase = [0, 0, 0, null, 0, null];
			for (var i = 0; i < 4; i++) {
				zbcase[0] += cp[i] << i * 4;
				zbcase[1] += co[i] << i * 4;
				zbcase[2] += ep[i] << i * 4;
			}
			for (var conj = 0; conj < 16; conj++) {
				var c0 = conj >> 2, c1 = conj & 3;
				var co2 = [], cp2 = [], ep2 = [];
				for (var i = 0; i < 4; i++) {
					co2[(i + c0) & 3] = co[i];
					cp2[(i + c0) & 3] = (cp[i] + c1) & 3;
					ep2[(i + c0) & 3] = (ep[i] + c1) & 3;
				}
				var co2i = getNOri(co2, 4, -3);
				var cp2i = getNPerm(cp2, 4, 0);
				var ep2i = getNPerm(ep2, 4, 0);
				var idx2 = (co2i * 24 + cp2i) * 24 + ep2i;
				if (isVisited[idx2 >> 5] >> (idx2 & 0x1f) & 1) continue;
				isVisited[idx2 >> 5] |= 1 << (idx2 & 0x1f);
				zbcase[4]++;
			}
			for (var i = 0; i < 12; i++) {
				cc.ea[i] = ep[i] << 1;
				if (i < 8) cc.ca[i] = co[i] << 3 | cp[i];
			}
			zbcase[3] = renderFacelet(
				"DDDDDDDDDLLLLLLLLLFFFFFFFFFUUUUUUUUURRRRRRRRRBBBBBBBBB",
				cc, [0,1,2,3,4,5,6,7,8,18,19,20,9,10,11,45,46,47,36,37,38]);
			if (idx > 0) zbll_map.push(zbcase);
		}
		return zbll_map;
	}

	var zbll_map = null;

	// ── Public API ──

	// Generate a scramble for the given ZBLL case index (in zbll_map)
	function scrambleByIndex(caseIdx) {
		if (!initialized || !zbll_map) return null;
		var zbcase = zbll_map[caseIdx % zbll_map.length];
		return getAnyScramble(zbcase[2] + 0xba9876540000, 0, zbcase[0] + 0x76540000, zbcase[1], 0, aufsuff, aufsuff);
	}

	// Generate a scramble for a random ZBLL case
	function scrambleRandom() {
		if (!initialized || !zbll_map) return null;
		var idx = Math.floor(Math.random() * zbll_map.length);
		return scrambleByIndex(idx);
	}

	// Convert an alg token to the notation mathlib accepts
	// Handles lowercase wide moves: r→Rw, l→Lw, f→Fw, b→Bw, u→Uw, d→Dw
	function normalizeMove(tok) {
		return tok.replace(/^([rlfbud])(['2]?)$/, function(_, face, suf) {
			return face.toUpperCase() + 'w' + suf;
		});
	}

	// Apply a full alg string to a CubieCube, one move at a time.
	// Pass inverse=true to apply A^{-1} (reversed order, each move inverted).
	function applyAlg(cc, algStr, inverse) {
		var tokens = algStr.trim().split(/\s+/);
		if (inverse) tokens.reverse();
		for (var i = 0; i < tokens.length; i++) {
			var tok = tokens[i];
			if (!tok) continue;
			cc.selfMoveStr(normalizeMove(tok), inverse);
		}
	}

	// Generate a random-state scramble given a ZBLL alg string.
	// Strategy: apply A forward to solved → get A(I), then invert to get
	// A^{-1}(I) = ZBLL case state.  Using forward application + invFrom
	// correctly handles y/x/z rotation moves in the alg (which only update
	// this.ori without moving pieces; naive reverse+invert misplaces those
	// rotations and produces the wrong case).
	function scrambleFromAlg(algStr) {
		if (!initialized) return null;
		// Strip AUF bracket e.g. "[U'] R U..." → "R U..."
		var clean = algStr.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
		try {
			// Apply alg FORWARD to solved cube → A(I) = A as a permutation
			var cc_fwd = new mathlib.CubieCube();
			applyAlg(cc_fwd, clean, false);

			// Invert: A^{-1}(I) = ZBLL case state
			// Using forward+invFrom correctly handles y/x/z rotation moves
			// (naive reverse+invert misplaces those rotations → wrong case)
			var cc = new mathlib.CubieCube();
			cc.invFrom(cc_fwd);

			// Apply random AUF (pre and post) directly on the CubieCube,
			// then pass the facelet string to the solver.
			var solution = '';
			var attempts = 0;
			do {
				if (++attempts > 20) return null;
				var cc2 = new mathlib.CubieCube();
				cc2.init(cc.ca, cc.ea);
				var cd = new mathlib.CubieCube();
				var rndpre = rndEl(aufsuff), rndapp = rndEl(aufsuff);
				for (var i = 0; i < rndpre.length; i++) {
					mathlib.CubieCube.CubeMult(mathlib.CubieCube.moveCube[rndpre[i]], cc2, cd);
					cc2.init(cd.ca, cd.ea);
				}
				for (var i = 0; i < rndapp.length; i++) {
					mathlib.CubieCube.CubeMult(cc2, mathlib.CubieCube.moveCube[rndapp[i]], cd);
					cc2.init(cd.ca, cd.ea);
				}
				var posit = cc2.toFaceCube();
				solution = search.solution(posit, 21, 1e9, 50, 2);
			} while (!solution || solution.length <= 3);
			return solution.replace(/ +/g, ' ').trim();
		} catch(e) {
			console.error('[zbllScrambler] scrambleFromAlg error:', e);
			return null;
		}
	}

	// Full init: build zbll_map + init solver (called once on page load)
	function fullInit(callback) {
		setTimeout(function() {
			try {
				ensureInit();
				zbll_map = genZBLLMap();
			} catch(e) {
				console.error('[zbllScrambler] init error:', e);
			}
			if (callback) callback();
		}, 0);
	}

	return {
		fullInit: fullInit,
		onReady: onReady,
		isReady: function() { return initialized && zbll_map !== null; },
		scrambleFromAlg: scrambleFromAlg,
		scrambleByIndex: scrambleByIndex,
		scrambleRandom: scrambleRandom
	};

})(mathlib.getNPerm, mathlib.setNPerm, mathlib.getNParity, mathlib.setNOri, mathlib.getNOri, mathlib.rn, mathlib.rndEl);
