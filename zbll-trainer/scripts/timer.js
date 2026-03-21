
import { zbllMap } from "./casesmap.js";
import { llmap } from "./llmap.js";
import { fillSelected } from "./practice.js";
import { isInBookmarks } from "./presets.js";
import { loadLocal, saveLocal } from "./saveload.js";
import { preloadImage, scrambleToVcUrl } from "./vccache.js";
import { processVirtInput, virtEnabled, virtualCube, virtMoves, setVirtMoves } from "./virtualcube.js";
import { selCases, recaps, recapTotal, currentMode } from "./practice.js"

let scramble = ""

let sessionSolves = [];
let sessionStartIndex = 0;
let sessionStartTime = null;
let sessionClockInterval = null;
let sessionPaused = false;
let sessionPausedAt = null;
let sessionPausedTotal = 0;
window.sessionActive = false;
let _lastSessionStats = null;
let _retrySessionFlag = false;
let _summaryPauseAt = null; // set when summary is shown so X can resume

var allowStartingTimer;
window.allowStartingTimer = allowStartingTimer
/// invokes generateScramble() and sets scramble string
function showScramble()
{
    window.allowStartingTimer = false;

    // Auto-end session when retry recap finishes all cases (only if session is active)
    if (window._retryRecapActive && recaps.length === 0) {
        window._retryRecapActive = false;
        displayPracticeInfo();
        if (window.sessionActive) {
            window.endSession();
        }
        return;
    }

    var s;
    if (selCases.length == 0)
        s = "click \"select cases\" above and pick some ZBLL cases to practice";
    else {
        scramble = generateScramble();
        if (scramble === '') return; // scrambler not ready — generateScramble handles display/retry
        s = "scramble: " + scramble;
        window.allowStartingTimer = true;
    }

    document.getElementById("scramble").innerHTML = '<span class="scramble-pill">' + s + '</span>';
    preloadImage(scramble);
}

function randomElement(arr)
{
    return arr[Math.floor(Math.random()*arr.length)];
}

var lastScramble = "";
window.lastScramble = lastScramble
var lastZbllCase = "";
window.lastZbllCase = lastZbllCase


function displayPracticeInfo() {
    var el = document.getElementById("selInfo");
    if (currentMode == 2 && recapTotal > 0 && recaps.length === 0) {
        el.innerHTML = "<span class='sel-num recap' style='color:#22c55e;'>✓</span><span class='sel-label recap' style='color:#22c55e;'>Completed all " + recapTotal + " cases!</span>";
    } else if (recaps.length > 0 && currentMode == 2) {
        el.innerHTML = "<span class='sel-num recap'>" + recaps.length + "</span><span class='sel-label recap'>out of " + recapTotal + " left</span>";
    } else {
        el.innerHTML = "<span class='sel-num'>" + selCases.length + "</span><span class='sel-label'>cases selected</span>";
    }
}

// Returns element from (selCases) based on its probability, and then decreases its probability by a factor.
// Normalizes probabilities before
function getZbllCasePbased() {
    // normalize selcases.p, making their sum=1
    function normalizeProps() {
        let sum = 0;
        selCases.forEach(function (c) {
            sum += c.p;
        });

        if (sum == 0)
            return console.log("sum=0. Nothing is selected?");

        selCases.forEach(function (c) {
            c.p /= sum;
        });
    }
    const factor = 2; // each case that we've already seen has that much less probability of showing up

    // debugging: log probabilities
    function logProps(index) {
        let s = "";
        for (let i = 0; i < selCases.length; ++i) {
            if (i == index)
                s += "^";
            s += Number.parseFloat(selCases[i].p).toFixed(3) + (i == selCases.length-1 ? "" : ", ");
        }
        console.log(s);
    }

    normalizeProps();

    let x = Math.random(); // 0 to 1, determines the case we're selecting

    var i = 0;
    for (; i < selCases.length; ++i) {
        x -= selCases[i].p;
        if (x <= 0)
            break;
    }

    selCases[i].p /= factor;
    return selCases[i];
}

function generateScramble()
{
    displayPracticeInfo();
    // get random case
    var zbllCase;
    if (recaps.length == 0) {
        zbllCase = getZbllCasePbased();
    } else {
        zbllCase = randomElement(recaps);
        const index = recaps.indexOf(zbllCase);
        recaps.splice(index, 1);
    }

    // Use csTimer random-state scrambler exclusively
    var finalAlg = null;
    if (typeof zbllScrambler !== 'undefined') {
        var shuffled = zbllCase.algs.slice().sort(function() { return Math.random() - 0.5; });
        for (var i = 0; i < shuffled.length && !finalAlg; i++) {
            finalAlg = zbllScrambler.scrambleFromAlg(shuffled[i]);
        }
    }

    // If scrambler not ready yet, show loading and retry via showScramble when ready.
    // Only queue the retry if the scrambler is not yet initialized — if it IS ready
    // but returned null anyway (error), show an error rather than recursing infinitely.
    if (!finalAlg) {
        window.lastZbllCase = zbllCase;
        if (typeof zbllScrambler !== 'undefined' && zbllScrambler.isReady()) {
            document.getElementById('scramble').innerHTML = '<span class="scramble-pill">Scramble error — reload page</span>';
        } else {
            document.getElementById('scramble').innerHTML = '<span class="scramble-pill">Loading scrambler\u2026</span>';
            if (typeof zbllScrambler !== 'undefined') {
                zbllScrambler.onReady(function() { showScramble(); });
            }
        }
        return '';
    }

    window.lastScramble = finalAlg;
    window.lastZbllCase = zbllCase;
    return finalAlg;
}

function inverse_scramble(s)
{
    if (s == "noAuf")
        return s;
    var arr = s.split(" ");
    var result = "";
    for (var i = 0; i < arr.length; i++)
    {
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

    return result.substr(0, result.length-1);
}

/*        TIMER        */

var startMilliseconds, stopMiliseconds; // date and time when timer was started
window.startMilliseconds = startMilliseconds
window.stopMiliseconds = stopMiliseconds
var allowed = true; // allowed var is for preventing auto-repeat when you hold a button
var running = false; var waiting = false;
var timer = document.getElementById("timer");
var timertext = document.getElementById("timertext");

function isMobile() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

let welcomeMessage = isMobile() ? "touch to start" : "ready";
timertext.innerHTML = welcomeMessage;

var timerActivatingButton = 32; // 17 for ctrl
var timeout;

function msToHumanReadable(duration) {
    if (!Number.isFinite(duration))
        return "-";
    var milliseconds = parseInt((duration%1000)/10)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)
        , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10 && (minutes > 0 || hours > 0)) ? "0" + seconds : seconds;
    milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

    let hoursString = (hours == 0) ? "" : hours + ":";
    let minutesString = (minutes == 0) ? "" : minutes + ":";

    return hoursString + minutesString + seconds + "." + milliseconds;
}

function displayTime() {
    if (running)
    {
        var d = new Date();
        var diff = d.getTime() - window.startMilliseconds;
        if (diff >= 0)
            timertext.innerHTML = msToHumanReadable(diff);
    }
}

/// handles keypup and keydown events. Starts timer etc.
document.getElementById("bodyid").addEventListener("keydown", function(event) {
    // delete hotkey - remove last
    if (event.keyCode == 46 && !running)
    {
        if (!!window.event.shiftKey)
            confirmClear();
        else
            confirmRemLast();
        return;
    }

    if (!allowed || !window.allowStartingTimer)
        return; // preventing auto-repeat and empty scrambles

    if (event.keyCode != 16) // shift
        allowed = false;

    if (running)
    {
        if (virtEnabled) {
            if (event.keyCode == timerActivatingButton || event.keyCode == 27) {
                timerStop()
            }
            else {
                processVirtInput(event)
            }
        }
        else {
            // stop timer on any button
            timerStop();
            return;
        }
    }
    else if (event.keyCode == timerActivatingButton && currentMode != 0)
    {
        timerSetReady();
        return;
    }
});

/// keyup event for starting the timer
document.getElementById("bodyid").addEventListener("keyup", function(event) {
    allowed = true;
    if (!window.allowStartingTimer)
        return; // preventing auto-repeat
    if (!running && !waiting && (event.keyCode == timerActivatingButton) && currentMode != 0) {
        timerStart();
    }
    else {
        timerAfterStop();
    }
});

timer.addEventListener("touchstart", handleTouchStart, false);
timer.addEventListener("touchend", handleTouchEnd, false);

function handleTouchEnd(e) {
    e.preventDefault();
    if (!window.allowStartingTimer)
        return; // preventing auto-repeat
    if (!running && !waiting) {
        timerStart();
    }
    else {
        timerAfterStop();
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    if (running)
        timerStop();
    else {
        timerSetReady(); // set green back
    }
}

function timerStop() {
    waiting = true;
    running = false;
    clearTimeout(timeout);

    var d = new Date();
    window.stopMiliseconds = d.getTime();
    timertext.innerHTML = msToHumanReadable(window.stopMiliseconds - window.startMilliseconds);
    timertext.style.color = "#850000";

    appendStats();
    showScramble();
}

function timerSetReady() {
    waiting = false;
    timertext.innerHTML = "0.00";
    timertext.style.color = "#008500";
}

function timerStart() {
    _hideOkDnfBtns();
    if (virtEnabled) {
        console.log( "applying scramble to virt" )
        virtualCube.alg = ''
        setVirtMoves('')
        let setup = inverse_scramble(randomElement(llmap)) + " " + scramble
        // randomly applies a ZBLL before applying the ZBLL scramble to simulate actual solves
        if (window.smoothMovement) {
            virtualCube.experimentalSetupAlg = setup
        }
        else {
            setVirtMoves(setup)
            virtualCube.alg = virtMoves
        }
    }
    var d = new Date();
    window.startMilliseconds = d.getTime();
    running = true;
    timeout = setInterval(displayTime, 10);
    timertext.style.color = document.getElementById( "textcolor_in" ).value;
}

function timerAfterStop() {
    timertext.style.color = document.getElementById( "textcolor_in" ).value;
}


// sizes. Too tired, cannot produce normal code
var defTimerSize = 60;
var defScrambleSize = 25;
var timerSize = parseInt(loadLocal("zblltimerSize", 0));
window.timerSize = timerSize
if (isNaN(window.timerSize) || window.timerSize <= 0)
    window.timerSize = defTimerSize;
var scrambleSize = parseInt(loadLocal("zbllscrambleSize", 0));
window.scrambleSize = scrambleSize

if (isNaN(window.scrambleSize) || window.scrambleSize <= 0)
    window.scrambleSize = defScrambleSize;

adjustSize('scramble', 0);
adjustSize('timertext', 0);

function adjustSize(item, inc)
{
    if (item == 'timertext')
    {
        window.timerSize = Math.min(200, Math.max(20, window.timerSize + inc));
        document.getElementById('timertext').style.fontSize = window.timerSize + "px";
        saveLocal("zblltimerSize", window.timerSize);
    }

    if (item == 'scramble')
    {
        window.scrambleSize = Math.min(60, Math.max(10, window.scrambleSize + inc));
        document.getElementById('scramble').style.fontSize = window.scrambleSize + "px";
        saveLocal("zbllscrambleSize", window.scrambleSize);
    }
}

function resetDefaults()
{
    window.timerSize = defTimerSize;
    window.scrambleSize = defScrambleSize;
    adjustSize('scramble', 0);
    adjustSize('timertext', 0);
}

/* STATS */

// http://stackoverflow.com/questions/1787322/htmlspecialchars-equivalent-in-javascript
function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/// [0: ResultInstance, 1: ResultInstance, ...]
var timesArray = [];
window.timesArray = timesArray
try {
    var loadedTa = JSON.parse(loadLocal("zblltimesarray", '[]'));
    if (loadedTa != null)
        timesArray = loadedTa;
} catch (e) {
    console.warn("can\'t load times. Running ZBLL trainer for the first time?");
}
displayStats();

// invoked right after the timer stopped
function appendStats()
{
    // assuming the time can be grabbed from timer label, and the case - window.lastPllCaseName
    var inst = makeResultInstance();
    window.timesArray.push(inst);
    if (window.sessionActive) {
        sessionSolves.push(inst);
    }
    displayStats();
    _showOkDnfBtns();
}

/// removes time from array and invokes displayStats()
function removeTime(i)
{
    window.timesArray.splice(i, 1);
    displayStats();
}

/// requests confirmation and deletes result
function confirmRem(i)
{
    var inst = window.timesArray[i];
    if (confirm("Are you sure you want to remove this time?\n\n" + inst["time"]))
    {
        removeTime(i);
        updateInstancesIndeces();
        displayStats();
    }
}

// user clicks "selected: no(yes)" on the scramble in practising mode
function changeSelection(i) {
    var r = window.timesArray[i];
    var selected = !(zbllMap[r["oll"]][r["coll"]][r["zbll"]]["c"]);
    zbllMap[r["oll"]][r["coll"]][r["zbll"]]["c"] = selected;
    document.getElementById("changeSelBtn").innerHTML = selected ? "is selected" : "not selected";
    // TODO instead of re-generating selCases, just remove one case from it
    fillSelected();
    //showScramble();
    displayPracticeInfo();
}

function confirmRemLast()
{
    var i = window.timesArray.length;
    if (i != 0)
        confirmRem(i - 1);
}

/// requests confirmation and empty times array (clear session)
function confirmClear()
{
    if (confirm("Are you sure you want to clear session?")) {
        window.timesArray = [];
        displayStats();
    }
}

/// \param i index of result instance
function timeClicked(i) {
    window.indexViewing = i;
    fillResultInfo(window.timesArray[i]);
}

/// \param r - result instance (see makeResultInstance)
/// \returns html code for displaying a single instance
function makeResultLabelHtml(r) {
    return "<span class='timeResult' onclick='window.timeClicked(" + r["index"] + ")'>" + r["time"] + "</span>";
}

/// calculates preview picture size based on the available space we have
function getPicSize() {
    var pictureTop = document.getElementById("previewPic").getBoundingClientRect().top;
    var cRect = document.getElementById("resultinfo").getBoundingClientRect();
    var minSize = Math.min(cRect.top + cRect.height - pictureTop, cRect.width);
    return Math.max(50, Math.round(minSize) - 5);
}

/// fills resultInfo container with info about given result instance
/// \param r result instsnce (see makeResultInstance)
/// set \param r to null if you want to clear result info
function fillResultInfo(r) {
    var picContainer = document.getElementById("resultPicContainer");
    if (r != null) {
        var s = "";
        s += "<div style='font-weight:700;color:#e8e8e8;margin-bottom:6px;'>result #" + (r["index"] + 1) + ": " + r["time"] + "</div>";
        s += "<div style='margin-bottom:4px;'><b>Scramble</b>: " + r["scramble"] + "</div>";
        s += "<div><b>Case</b>: " + r["oll"] +"-"+ r["coll"] +", "+ r["zbll"].replace("s", "/") + "</div>";
        s += "<button onclick='window.confirmRem(" + r["index"] + ")' class='result-delete-btn'>Delete</button>";

        document.getElementById("resultInfoContainer").innerHTML = s;
        picContainer.innerHTML = "";
    }
    else {
        document.getElementById("resultInfoContainer").innerHTML = "<span style='color:#555;'>click a time to see details</span>";
        picContainer.innerHTML = "";
        window.indexViewing = 0;
    }

}

/// calculates average of \param n in window.timesArray in interval from (end-n, end]
function getAverage(end, n) {
    if (end < n-1)
        return Infinity;
    var sum = 0, ms, best=Infinity, worst=-1;
    for (var i = end; i > end-n; i--) {
        ms = window.timesArray[i]["ms"];
        if (ms < best)
            best = ms;
        if (ms > worst)
            worst = ms;
        sum += ms;
    }
    return (sum-best-worst)/(n-2);
}

/// displays averages etc.
function displayStatsBox() {
    var len = window.timesArray.length;
    document.getElementById("resultInfoHeader").innerHTML = "stats: " + len + " solves";
    document.getElementById("resultPicContainer").innerHTML = "";
    var s = "";
    if (len > 1) {
        var best = Infinity, worst = -1, sum = 0, bestIns, worstIns, bestAo5 = best, bestAo12 = best, ao5, ao12;
        for (var i = 0; i < len; i++) {
            var ms = window.timesArray[i]["ms"];
            sum += ms;
            // best and worst
            if (ms < best) {
                best = ms;
                bestIns = window.timesArray[i];
            } if (ms > worst) {
                worst = ms;
                worstIns = window.timesArray[i];
            }
            // averages
            ao5 = getAverage(i, 5);
            if (ao5 < bestAo5)
                bestAo5 = ao5;
            ao12 = getAverage(i, 12);
            if (ao12 < bestAo12)
                bestAo12 = ao12;
        }
        s += "best time: " + makeResultLabelHtml(bestIns) + "<br>";
        s += "worst time: " + makeResultLabelHtml(worstIns) + "<br><br>";
        s += "current ao5: " + msToHumanReadable(ao5) + "<br>";
        s += "best ao5: " + msToHumanReadable(bestAo5) + "<br><br>";
        s += "current ao12: " + msToHumanReadable(ao12) + "<br>";
        s += "best ao12: " + msToHumanReadable(bestAo12) + "<br><br>";
        s += "session avg: " + msToHumanReadable((sum-best-worst)/(len-2)) + "<br>";
        s += "session mean: " + msToHumanReadable(sum/len) + "<br>";
    }

    document.getElementById("resultInfoContainer").innerHTML = s;
}

/// fills "times" right panel with times and last result info
function displayStats() {
    saveLocal("zblltimesarray", JSON.stringify(window.timesArray));
    var len = window.timesArray.length

    var el = document.getElementById("times");
    el.innerHTML = "";

    // Update stats box
    const statsBoxEl = document.getElementById('statsBox');
    if (statsBoxEl) {
        const curAo5 = getAverage(len - 1, 5);
        let bestAo5 = Infinity;
        for (let i = 4; i < len; i++) {
            const a = getAverage(i, 5);
            if (a < bestAo5) bestAo5 = a;
        }
        let mean = '-';
        if (len > 0) {
            const sum = window.timesArray.reduce((acc, t) => acc + t.ms, 0);
            mean = msToHumanReadable(sum / len);
        }
        statsBoxEl.innerHTML =
            '<div class="stat-row"><span class="stat-lbl">Ao5</span><span class="stat-val">' + (Number.isFinite(curAo5) ? msToHumanReadable(curAo5) : '-') + '</span></div>' +
            '<div class="stat-row"><span class="stat-lbl">Best Ao5</span><span class="stat-val">' + (Number.isFinite(bestAo5) ? msToHumanReadable(bestAo5) : '-') + '</span></div>' +
            '<div class="stat-row"><span class="stat-lbl">Mean</span><span class="stat-val">' + mean + '</span></div>';
    }

    if (len == 0) {
        fillResultInfo(null);
        return;
    }

    for (var i = 0; i < window.timesArray.length; i++) {
        el.innerHTML += makeResultLabelHtml(window.timesArray[i]);
        if (i != len - 1)
            el.innerHTML += ", ";
    }
    window.indexViewing = window.timesArray.length - 1;
    fillResultInfo(window.timesArray[window.indexViewing]);
}

/// foreach result instances, assign its index to number in array.
/// might be helpful after user deleted the time
function updateInstancesIndeces() {
    for (var i = 0; i < window.timesArray.length; i++)
        window.timesArray[i]["index"] = i;
}

function makeResultInstance() {
    var currentTime = document.getElementById("timertext").innerHTML;
    return {
        "time": currentTime,
        "scramble": window.lastScramble,
        // "name": window.lastZbllCase.name,
        "ms": timeStringToMseconds(currentTime) * 10, // *10 because current time 1.23 display only hundreths, not thousandth of a second
        "index": window.timesArray.length,
        "oll": window.lastZbllCase.oll,
        "coll": window.lastZbllCase.coll,
        "zbll": window.lastZbllCase.zbll,
        "dnf": false,
        "incorrect": false,
    };
}

// converts timestring to milliseconds (int)
// 1:06.15 -> 6615
function timeStringToMseconds(s) {
        if (s == "")
            return -1;
        var parts = s.split(":");
        var secs = parseFloat(parts[parts.length - 1]);
        if (parts.length > 1) // minutes
            secs += parseInt(parts[parts.length - 2]) * 60;
        if (parts.length > 2) // hrs
            secs += parseInt(parts[parts.length - 3]) * 3600;
        if (isNaN(secs))
            return -1;
        return Math.round(secs * 100);
}

// add key listeners to blur settings inputs
var inputs = document.getElementsByClassName("settinginput");
Array.prototype.forEach.call(inputs, function(el) {
    el.addEventListener("keydown", function(event) {
        if (event.keyCode == 13 || event.keyCode == 32 || event.keyCode == 27) {
            event.preventDefault()
            el.blur();
        }
    });

});


window.adjustSize = adjustSize
window.confirmClear = confirmClear
window.displayStatsBox = displayStatsBox
window.timeClicked = timeClicked
window.confirmRem = confirmRem
window.adjustSize = adjustSize
window.confirmClear = confirmClear
window.displayStatsBox = displayStatsBox
window.timeClicked = timeClicked
window.confirmRem = confirmRem
window.changeSelection = changeSelection

/* ── OK / DNF / Incorrect ────────────────────────────────────── */
function _showOkDnfBtns() {
    const row = document.getElementById('okDnfRow');
    if (row) row.style.display = 'flex';
    // reset incorrect button
    const incBtn = document.getElementById('incorrectBtn');
    if (incBtn) { incBtn.textContent = 'Mark Incorrect'; incBtn.dataset.active = '0'; }
}
function _hideOkDnfBtns() {
    const row = document.getElementById('okDnfRow');
    if (row) row.style.display = 'none';
    const colorInput = document.getElementById('textcolor_in');
    if (timertext && colorInput) timertext.style.color = colorInput.value;
}

function markDNF() {
    if (window.timesArray.length === 0) return;
    const last = window.timesArray[window.timesArray.length - 1];
    if (last.dnf) return; // already DNF
    last.dnf = true;
    last._origTime = last.time;
    last.time = 'DNF';
    timertext.innerHTML = 'DNF';
    timertext.style.color = '#e05252';
    displayStats();
}

function markOK() {
    if (window.timesArray.length === 0) return;
    const last = window.timesArray[window.timesArray.length - 1];
    last.dnf = false;
    last.incorrect = false;
    if (last._origTime) { last.time = last._origTime; timertext.innerHTML = last.time; }
    timertext.style.color = document.getElementById('textcolor_in').value;
    const incBtn = document.getElementById('incorrectBtn');
    if (incBtn) { incBtn.textContent = 'Mark Incorrect'; incBtn.dataset.active = '0'; }
    displayStats();
}

function markIncorrect() {
    if (window.timesArray.length === 0) return;
    const last = window.timesArray[window.timesArray.length - 1];
    if (last.incorrect) return; // already marked — only OK can undo this
    last.incorrect = true;
    last.dnf = true;
    last._origTime = last.time;
    last.time = 'DNF';
    timertext.innerHTML = 'DNF';
    timertext.style.color = '#e05252';
    const incBtn = document.getElementById('incorrectBtn');
    if (incBtn) { incBtn.textContent = '✓ Marked Incorrect'; incBtn.dataset.active = '1'; }
    displayStats();
}

window.markDNF = markDNF;
window.markOK = markOK;
window.markIncorrect = markIncorrect;

/* ── Session ─────────────────────────────────────────────────── */
function _updateSessionClock() {
    const el = document.getElementById('sessionClock');
    if (!el) return;
    const elapsed = Date.now() - sessionStartTime - sessionPausedTotal;
    const totalSecs = Math.floor(elapsed / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    el.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function startSession() {
    sessionSolves = [];
    sessionStartIndex = window.timesArray.length;
    sessionStartTime = Date.now();
    sessionPaused = false;
    sessionPausedTotal = 0;
    window.sessionActive = true;

    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.style.display = 'none';
    const controls = document.getElementById('sessionControls');
    if (controls) controls.style.display = 'inline-flex';
    const pauseBtn = document.getElementById('pauseSessionBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

    if (sessionClockInterval) clearInterval(sessionClockInterval);
    _updateSessionClock();
    sessionClockInterval = setInterval(_updateSessionClock, 1000);
}

function pauseSession() {
    if (!window.sessionActive) return;
    const pauseBtn = document.getElementById('pauseSessionBtn');
    if (sessionPaused) {
        // Resume
        sessionPausedTotal += Date.now() - sessionPausedAt;
        sessionPausedAt = null;
        sessionPaused = false;
        if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
        sessionClockInterval = setInterval(_updateSessionClock, 1000);
    } else {
        // Pause
        sessionPausedAt = Date.now();
        sessionPaused = true;
        if (pauseBtn) pauseBtn.textContent = '▶ Resume';
        clearInterval(sessionClockInterval);
        sessionClockInterval = null;
    }
}

function cancelSession() {
    window.sessionActive = false;
    sessionPaused = false;
    _summaryPauseAt = null;
    window._retryRecapActive = false;
    if (sessionClockInterval) { clearInterval(sessionClockInterval); sessionClockInterval = null; }
}

function endSession() {
    window.sessionActive = false;
    sessionPaused = false;
    _summaryPauseAt = Date.now(); // track time spent in summary for resume
    if (sessionClockInterval) { clearInterval(sessionClockInterval); sessionClockInterval = null; }
    _hideOkDnfBtns();
    const controls = document.getElementById('sessionControls');
    if (controls) controls.style.display = 'none';
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.style.display = 'none';
    showSessionSummary();
}

function resumeSession() {
    // Account for time spent viewing summary so the clock stays accurate
    if (_summaryPauseAt) {
        sessionPausedTotal += Date.now() - _summaryPauseAt;
        _summaryPauseAt = null;
    }
    window.sessionActive = true;
    sessionPaused = false;

    const modal = document.getElementById('sessionModal');
    if (modal) modal.classList.remove('open');

    const controls = document.getElementById('sessionControls');
    if (controls) controls.style.display = 'inline-flex';
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.style.display = 'none';
    const pauseBtn = document.getElementById('pauseSessionBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

    if (sessionClockInterval) clearInterval(sessionClockInterval);
    _updateSessionClock();
    sessionClockInterval = setInterval(_updateSessionClock, 1000);
}

function discardSession() {
    _summaryPauseAt = null;
    // Remove all solves recorded during this session from timesArray
    if (sessionStartIndex >= 0 && window.timesArray.length > sessionStartIndex) {
        window.timesArray.splice(sessionStartIndex);
        displayStats();
    }
    const modal = document.getElementById('sessionModal');
    if (modal) modal.classList.remove('open');
    cancelSession();
    setTimeout(() => window.changeMode(0), 150);
}

// Used by the X button — resumes if in session summary, otherwise just closes
function closeSessionModal() {
    if (_summaryPauseAt !== null) {
        resumeSession();
    } else {
        const modal = document.getElementById('sessionModal');
        if (modal) modal.classList.remove('open');
    }
}

function _buildTimeListHtml(solves) {
    if (!solves || solves.length === 0) return '';
    let html = '<div class="summary-section-label">All times (' + solves.length + ')</div><div class="time-list">';
    solves.forEach((s, i) => {
        const bad = s.dnf || s.incorrect;
        html += '<div class="time-list-item">' +
            '<span class="tl-num">' + (i + 1) + '.</span>' +
            '<span class="tl-time' + (s.dnf ? ' tl-dnf' : '') + '">' + escapeHtml(s.time) + '</span>' +
            '<span class="tl-case">' + escapeHtml(s.case || '') + '</span>' +
            (bad ? '<span class="tl-status tl-bad">\u2717</span>' : '<span class="tl-status tl-good">\u2713</span>') +
            '</div>';
    });
    html += '</div>';
    return html;
}

function showSessionSummary() {
    const modal = document.getElementById('sessionModal');
    if (!modal) return;

    // Consume retry flag
    const isRetry = _retrySessionFlag;
    _retrySessionFlag = false;

    const sessionSolvesData = window.timesArray.slice(sessionStartIndex);
    const total = sessionSolvesData.length;
    const validSolves = sessionSolvesData.filter(s => !s.dnf);
    const correctSolves = sessionSolvesData.filter(s => !s.dnf && !s.incorrect);
    const incorrectSolves = sessionSolvesData.filter(s => s.dnf || s.incorrect);

    // Deduplicate incorrect cases by oll+coll+zbll
    const incorrectCaseMap = {};
    incorrectSolves.forEach(s => {
        const key = s.oll + '|' + s.coll + '|' + s.zbll;
        if (!incorrectCaseMap[key]) {
            incorrectCaseMap[key] = {
                oll: s.oll, coll: s.coll, zbll: s.zbll,
                desc: s.oll + '-' + s.coll + ', ' + s.zbll.replace('s', '/'),
            };
        }
    });

    // Timing stats from valid (non-DNF) solves only
    let meanStr = '-', avgStr = '-', bestAo5Str = '-', bestSingleStr = '-';
    if (validSolves.length > 0) {
        const times = validSolves.map(s => s.ms);
        const sum = times.reduce((a, b) => a + b, 0);
        meanStr = msToHumanReadable(sum / times.length);
        if (times.length >= 3) {
            const sorted = [...times].sort((a, b) => a - b);
            const trimmedSum = sorted.slice(1, -1).reduce((a, b) => a + b, 0);
            avgStr = msToHumanReadable(trimmedSum / (times.length - 2));
        } else {
            avgStr = meanStr;
        }
        bestSingleStr = msToHumanReadable(Math.min(...times));
        if (times.length >= 5) {
            let bestAo5 = Infinity;
            for (let i = 4; i < times.length; i++) {
                const w = times.slice(i - 4, i + 1);
                const ws = [...w].sort((a, b) => a - b);
                const ao5 = (ws[1] + ws[2] + ws[3]) / 3;
                if (ao5 < bestAo5) bestAo5 = ao5;
            }
            bestAo5Str = msToHumanReadable(bestAo5);
        }
    }

    const sessionDurationMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const sessionTimeStr = msToHumanReadable(sessionDurationMs);

    const incorrectKeys = Object.keys(incorrectCaseMap);
    let incorrectHtml = '';
    if (incorrectKeys.length > 0) {
        incorrectHtml = '<div class="summary-section-label">Cases to redo (' + incorrectKeys.length + ')</div><div class="summary-case-tags">';
        incorrectKeys.forEach(k => {
            incorrectHtml += '<span class="summary-case-tag">' + escapeHtml(incorrectCaseMap[k].desc) + '</span>';
        });
        incorrectHtml += '</div>';
    }

    const pct = total === 0 ? 0 : Math.round(correctSolves.length / total * 100);
    const correctLabel = total === 0
        ? 'No solves recorded.'
        : 'You got <b>' + correctSolves.length + '</b> out of <b>' + total + '</b> correct <b>(' + pct + '%)</b>';

    // Build solves array for storage and time list
    const solvesSnapshot = sessionSolvesData.map(s => ({
        time: s.time,
        case: s.oll + '-' + s.coll + ', ' + s.zbll.replace('s', '/'),
        dnf: s.dnf || false,
        incorrect: s.incorrect || false,
    }));

    const retryBadge = isRetry ? '<span class="summary-retry-badge">Retry Session</span>' : '';

    document.getElementById('summaryBody').innerHTML =
        '<div class="summary-highlight">' + retryBadge + correctLabel + '</div>' +
        '<div class="summary-grid">' +
            '<div class="summary-item"><div class="summary-label">Session Mean</div><div class="summary-val">' + meanStr + '</div></div>' +
            '<div class="summary-item"><div class="summary-label">Best Ao5</div><div class="summary-val">' + bestAo5Str + '</div></div>' +
            '<div class="summary-item"><div class="summary-label">Best Single</div><div class="summary-val">' + bestSingleStr + '</div></div>' +
            '<div class="summary-item summary-item--wide"><div class="summary-label">Time Drilling</div><div class="summary-val">' + sessionTimeStr + '</div></div>' +
        '</div>' +
        incorrectHtml +
        '<div class="summary-notes-wrap">' +
            '<div class="summary-section-label">Session Notes <span class="summary-notes-optional">(optional)</span></div>' +
            '<textarea id="sessionNotesInput" class="summary-notes-input" placeholder="How did it go? Any cases to focus on next time..."></textarea>' +
        '</div>' +
        _buildTimeListHtml(solvesSnapshot);

    const retryBtn = document.getElementById('retryIncorrectBtn');
    if (retryBtn) {
        if (incorrectKeys.length > 0) {
            retryBtn.style.display = 'inline-flex';
            retryBtn.onclick = function() {
                modal.classList.remove('open');
                _summaryPauseAt = null; // continuing session via retry, no resume needed
                _retrySessionFlag = true;
                const cases = incorrectKeys.map(k => {
                    const c = incorrectCaseMap[k];
                    return {
                        p: 1,
                        algs: zbllMap[c.oll][c.coll][c.zbll].algs,
                        desc: c.desc,
                        oll: c.oll, coll: c.coll, zbll: c.zbll,
                    };
                });
                window.setCustomSelCases(cases);
                window._retryRecapActive = true;
                window._continueSessionForRetry = true;
                window.changeMode(2);
            };
        } else {
            retryBtn.style.display = 'none';
        }
    }

    // Store stats for saveSession() to use
    _lastSessionStats = {
        meanStr, bestAo5Str, bestSingleStr,
        durationMs: sessionDurationMs,
        incorrectCases: incorrectKeys.map(k => incorrectCaseMap[k]), // {oll, coll, zbll, desc}
        solves: solvesSnapshot,
        isRetry,
    };

    // Restore modal to end-of-session state (in case it was used for history detail view)
    const saveBtn = document.getElementById('saveSessionBtn');
    if (saveBtn) { saveBtn.style.display = ''; saveBtn.textContent = 'Save Session'; saveBtn.disabled = false; }
    const backBtn = document.getElementById('backToSelectionBtn');
    if (backBtn) { backBtn.style.display = ''; backBtn.textContent = 'Discard Session'; backBtn.onclick = discardSession; }
    const closeHistBtn = document.getElementById('sessionDetailCloseBtn');
    if (closeHistBtn) closeHistBtn.style.display = 'none';
    const deleteHistBtn = document.getElementById('deleteSessionBtn');
    if (deleteHistBtn) deleteHistBtn.style.display = 'none';
    document.getElementById('sessionModalTitle').textContent = 'Session Summary';

    modal.classList.add('open');
}

function saveSession() {
    const btn = document.getElementById('saveSessionBtn');
    const stats = _lastSessionStats || {};
    const sessionSolvesData = stats.solves || window.timesArray.slice(sessionStartIndex);
    const total = sessionSolvesData.length;
    const correctSolves = sessionSolvesData.filter(s => !s.dnf && !s.incorrect);
    const pct = total === 0 ? 0 : Math.round(correctSolves.length / total * 100);
    const sessionDurationMs = stats.durationMs || (sessionStartTime ? Date.now() - sessionStartTime - sessionPausedTotal : 0);
    const notesEl = document.getElementById('sessionNotesInput');
    const notes = notesEl ? notesEl.value.trim() : '';

    const record = {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        notes,
        total,
        correct: correctSolves.length,
        pct,
        durationMs: stats.durationMs || sessionDurationMs,
        meanStr: stats.meanStr || '-',
        bestAo5Str: stats.bestAo5Str || '-',
        bestSingleStr: stats.bestSingleStr || '-',
        incorrectCases: stats.incorrectCases || [],
        solves: stats.solves || [],
        isRetry: stats.isRetry || false,
    };

    try {
        const saved = JSON.parse(localStorage.getItem('zbllSessions') || '[]');
        saved.push(record);
        localStorage.setItem('zbllSessions', JSON.stringify(saved));
        if (btn) { btn.textContent = 'Saved ✓'; btn.disabled = true; }
        if (typeof window.refreshSessionsPanel === 'function') window.refreshSessionsPanel();
        _summaryPauseAt = null; // session is being saved, no need to resume
        const modal = document.getElementById('sessionModal');
        if (modal) modal.classList.remove('open');
        setTimeout(() => window.changeMode(0), 150);
    } catch(e) {
        if (btn) btn.textContent = 'Error saving';
    }
}

window.startSession = startSession;
window.pauseSession = pauseSession;
window.cancelSession = cancelSession;
window.endSession = endSession;
window.resumeSession = resumeSession;
window.discardSession = discardSession;
window.closeSessionModal = closeSessionModal;
window.saveSession = saveSession;

window.retryHistorySession = function(incorrectCases) {
    const cases = incorrectCases
        .filter(c => c && c.oll && c.coll && c.zbll
            && zbllMap[c.oll] && zbllMap[c.oll][c.coll] && zbllMap[c.oll][c.coll][c.zbll])
        .map(c => ({
            p: 1,
            algs: zbllMap[c.oll][c.coll][c.zbll].algs,
            desc: c.desc,
            oll: c.oll, coll: c.coll, zbll: c.zbll,
        }));
    if (cases.length === 0) return;
    window.setCustomSelCases(cases);
    window.changeMode(2);
};

export { isMobile, displayStatsBox, resetDefaults, adjustSize, getPicSize, displayPracticeInfo, showScramble, displayStats }