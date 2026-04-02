import { zbllMap } from "./casesmap.js";
import { renderSelection, adjustInfo } from "./selection.js";
import { displayPracticeInfo, showScramble, displayStats } from "./timer.js";

let selCases = [];
let recaps = [];
let recapTotal = 0;
let currentMode = 0; // 0 = selection, 1 = practicing, 2 = recap
let _useCustomSelCases = false; // set true when retrying incorrect cases

/// \param m = mode: 0 = selection, 1 = practicing, 2 = recap
function changeMode(m)
{
    // Validate that cases are selected before entering practice mode
    if (m !== 0 && !_useCustomSelCases) {
        let selectedCount = 0;
        for (var oll in zbllMap) {
            var ollMap = zbllMap[oll];
            for (var coll in ollMap) {
                for (var zbll in ollMap[coll]) {
                    if (ollMap[coll][zbll]['c']) { selectedCount++; break; }
                }
                if (selectedCount) break;
            }
            if (selectedCount) break;
        }
        if (selectedCount === 0) {
            if (typeof window.showNoCasesAlert === 'function') window.showNoCasesAlert();
            return;
        }
    }

    // Warn before going back if a session is active
    if (m === 0 && window.sessionActive) {
        if (typeof window.showGoBackWarning === 'function') window.showGoBackWarning();
        return;
    }

    currentMode = m;
    var pr = document.getElementsByClassName("practice_layout");
    for (var i = 0; i < pr.length; i++)
        pr[i].style.display = (m == 0) ? 'none' : 'flex';

    var se = document.getElementById("selection_layout");
    se.style.display = (m == 0) ? 'flex' : 'none';

    if (m == 0) {
        // going back to selection — cancel any active session cleanly
        const prompt = document.getElementById('startSessionPrompt');
        if (prompt) prompt.style.display = 'none';
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) startBtn.style.display = 'none';
        const controls = document.getElementById('sessionControls');
        if (controls) controls.style.display = 'none';
        if (typeof window.cancelSession === 'function') window.cancelSession();
        window.sessionActive = false;
        const simg = document.getElementById('scrambleImg');
        if (simg) simg.style.display = 'none';
        const slbl = document.getElementById('scrambleImgLabel');
        if (slbl) slbl.style.display = 'none';
        renderSelection();
        adjustInfo();
        return;
    }

    if (window._continueSessionForRetry) {
        // Retry flow: continue the existing session — keep clock running, no Start button
        window._continueSessionForRetry = false;
        window.sessionActive = true;
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) startBtn.style.display = 'none';
        const controls = document.getElementById('sessionControls');
        if (controls) controls.style.display = 'inline-flex';
    } else {
        // Normal entry: prompt user whether to start a session
        if (typeof window.showStartSessionPrompt === 'function') {
            window.showStartSessionPrompt();
        } else {
            const startBtn = document.getElementById('startSessionBtn');
            if (startBtn) startBtn.style.display = 'inline-flex';
        }
    }

    // switch to practising layout
    if (_useCustomSelCases) {
        _useCustomSelCases = false; // consume the flag; selCases already set
    } else {
        fillSelected();
    }
    recaps = (m == 2) ? selCases.slice() : [];
    recapTotal = recaps.length;
    // practice
    displayPracticeInfo();
    showScramble();
    adjustInfo();
    displayStats();
}

/// Sets selCases to a custom list (for retrying incorrect cases)
function setCustomSelCases(casesList) {
    selCases.length = 0;
    casesList.forEach(c => selCases.push(c));
    _useCustomSelCases = true;
}
window.setCustomSelCases = setCustomSelCases;

/// after selecting cases, this func fills selCases array with selected cases from map
// case.p = probability, normaized
function fillSelected()
{
    selCases = []
    for (var oll in zbllMap) if (zbllMap.hasOwnProperty(oll)) {
        var ollMap = zbllMap[oll];
        for (var coll in ollMap) if (ollMap.hasOwnProperty(coll)) {
            let collMap = ollMap[coll];
            for (var zbll in collMap) if (collMap.hasOwnProperty(zbll)) {
                if (collMap[zbll]["c"])
                {
                    selCases.push(
                        {
                            p: 1, // probability of generating scramble with this case
                            algs: collMap[zbll]["algs"],
                            desc: oll+"-"+coll+", "+zbll.replace("s", "/"),
                            oll: oll,
                            coll: coll,
                            zbll: zbll,
                        }
                    );
                }
            }
        }
    }
}

/// \returns random integer from 0 to h
function randomNum(h) {
    return Math.floor(Math.random() * h);
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function inverse_scramble(s) {
    // deleting parantheses and double spaces
    s = s.replaceAll('[', " ");
    s = s.replaceAll(']', " ");
    s = s.replaceAll('(', " ");
    s = s.replaceAll(')', " ");
    while(s.indexOf("  ") != -1)
        s = s.replaceAll("  ", " ");

    // replacing apostrophes with primes
    var apostrophesChars = "ʼ᾿ߴ՚’`";
    for (var i = 0; i < apostrophesChars.length; i++)
        s = s.replaceAll(apostrophesChars[i], "'");

    var arr = s.split(" ");
    var result = "";
    for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (it.length == 0)
            continue;
        if (it[it.length - 1] == '2')
            result = it + " " + result;
        else if (it[it.length - 1] == '\'')
            result = it.substr(0, it.length - 1) + " " + result;
        else
            result = it + "' " + result;
    }

    return result;
}

window.changeMode = changeMode;
export { inverse_scramble, randomNum, changeMode, fillSelected, setCustomSelCases, selCases, recaps, recapTotal, currentMode }