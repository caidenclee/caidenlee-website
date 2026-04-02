import { zblsMap } from './casesmap.js'
import { getSelectionStringFromZBLLMap, loadLocal, saveLocal, setZBLLMapFromSelectionString } from './saveload.js';
import { getPicSize } from './timer.js';
import { currentMode } from './practice.js'
/* colors correspond to selection state */

var colorAll = "#2e7d46";
var colorSome = "#e8c000";
function colorNone() {
    return document.getElementById( "bgcolor_in" ).value;
}

var imgSize = 70;

function saveSelection() {
    return saveLocal('zbllSelection', getSelectionStringFromZBLLMap());
}
window.saveSelection = saveSelection

function loadSelection() {
    var selectionString = loadLocal('zbllSelection', '');
    if (selectionString == '') {
        console.warn("failed loading selection");
        return false;
    }
    setZBLLMapFromSelectionString(selectionString);
    return true;
}


// allocate help;
function adjustInfo()
{
    // resizing info panel in practice screen
    if (document.getElementById( "previewPic" ) != null)
            document.getElementById( "resultPicContainer" ).style.height = getPicSize() + "px";

    if (currentMode == 0) {

        var cases = document.getElementById( "cases_selection" )
        let rectW = Math.min(cases.getBoundingClientRect().width, document.body.getBoundingClientRect().width - 299)
        let screenTooSmall = document.body.clientWidth - rectW < 300
        
        let infoPanel = document.getElementById( "panel_right" )
        let selectionContainer = document.getElementById( "selection_layout" )
        
        if(screenTooSmall) {
            infoPanel.style.position = "relative";
            infoPanel.style.left = 0;
            infoPanel.style.width = "90vw";
            
            selectionContainer.style.flexDirection = "column";
            selectionContainer.style.justifyContent = "center";
            
            cases.style.margin = "auto"
        }
        else {
        infoPanel.style.position = "absolute";
        infoPanel.style.left = cases.getBoundingClientRect().right + "px";
        infoPanel.style.width = (document.body.clientWidth - cases.getBoundingClientRect().right - 30) + "px";
        
        selectionContainer.style.flexDirection = "row";
        selectionContainer.style.justifyContent = "flex-start";
        
        cases.style.margin = 0
    }
}

    
}


/* ids */
function idTdOll(oll) {return "td-"+oll;}
function idTdColl(oll,coll) {return "td-"+oll+"-"+coll;}
function idItemOll(oll) {return "item-"+oll;}
function idItemColl(oll,coll) {return "item-"+oll+"-"+coll;}
function idItemZbll(oll,coll, zbll) {return "item-"+oll+"-"+coll+"-"+zbll;}
function idHeaderOll(oll) {return "ollHead-"+oll;}
function idHeaderColl(oll,coll) {return "collHead-"+oll+"-"+coll;}
function zbllSvg(oll,coll, zbll) {return "caseImage/ZBLS/"+"level3"+"/"+oll+"-"+coll+"-"+zbll.replace("/", "s")+".png";}


function prepareMap() {
    for (var oll in zblsMap) if (zblsMap.hasOwnProperty(oll)) {
        var ollMap = zblsMap[oll];
        for (var coll in ollMap) if (ollMap.hasOwnProperty(coll)) {
            let collMap = ollMap[coll];
            for (var zbll in collMap) if (collMap.hasOwnProperty(zbll)) {
                var zbllAlgs = collMap[zbll];
                collMap[zbll] = {"algs":zbllAlgs, "c":false};
            }
        }
    }
}

function colorBySelection(all, none)
{
    if ( !all && !none ) // some selected: yellow
        return colorSome;
    if (all)
        return colorAll;
    return colorNone();
}

/// iterates the zblsMap and highlights HTML elements according to the selection
function renderSelection()
{
    var totalZbllSel = 0;
    for (var oll in zblsMap) if (zblsMap.hasOwnProperty(oll)) {
        var ollNoneSel = true, ollAllSel = true; // ollNoneSel = 0 selected, ollAllSel = all cases selected
        var zbllsInOll = 0;
        var ollMap = zblsMap[oll];
        for (var coll in ollMap) if (ollMap.hasOwnProperty(coll)) {
            var collNoneSel = true, collAllSel = true; // ollNoneSel = 0 selected, ollAllSel = all cases selected	
            var zbllsInColl = 0;
            let collMap = ollMap[coll];
            for (var zbll in collMap) if (collMap.hasOwnProperty(zbll)) {
                var zbllAlg = collMap[zbll];
                if (collMap[zbll]["c"])
                {
                    // case selected
                    ollNoneSel = false;
                    collNoneSel = false;
                    zbllsInColl++; zbllsInOll++; totalZbllSel++;
                }
                else {
                    // case not selected
                    ollAllSel = false;
                    collAllSel = false;
                }
            }
            // render coll item background
            document.getElementById( idTdColl(oll, coll) ).style.backgroundColor = colorBySelection(collAllSel, collNoneSel);
            document.getElementById( idHeaderColl(oll, coll) ).innerHTML = collHeaderContent(oll, coll, zbllsInColl);
        }
        document.getElementById( idTdOll(oll) ).style.backgroundColor = colorBySelection(ollAllSel, ollNoneSel);
        document.getElementById( idHeaderOll(oll) ).innerHTML = ollHeaderContent(oll, zbllsInOll);
    }

    // Save the selection to local storage if possible
    if (window.saveSelection) { // No guarantee that saveSelection function is ready, so test first
        saveSelection();
    }
}

/* items generator */
function generateSelectionTable()
{
    var s = "";
    var maxColls = 10;
    s += "<table class='casesTable'>";

    // generate table header with OLL cases
    s += "<tr>";
    for (var oll in zblsMap) {
        if (zblsMap.hasOwnProperty(oll)) {
            s += "<td id='" + idTdOll(oll) + "' style='background-color:" +colorNone()+";'>" + ollItem(oll) + "</td>";
            // .style.backgroundColor
        }
    }
    s += "</tr>";

    // generating the rest of the table with coll cases
    for (var row = 0; row < maxColls; row++)
    {
        s += "<tr>";

        for (var oll in zblsMap) {
            if (zblsMap.hasOwnProperty(oll)) {
                var collName = getCollByNum(oll, row);
                if (!collName) {
                    s += "<td class='collTd' id='td-empty'>(none)</td>";
                }
                else {
                    s += "<td class='collTd' id='" + idTdColl(oll,collName) + "'>" + collItem(oll, collName) + "</td>";
                }
            }
        }

        s += "</tr>";
    }
    s += "</table>";

    document.getElementById("cases_selection").innerHTML = s;
}

function zbllItem(oll, coll, zbll) // div with img
{
    var s = "";
    var col = colorNone();
    if (zblsMap[oll][coll][zbll]["c"])
        col = colorAll;
    s += "<div ";
    s += "id='" + idItemZbll(oll, coll, zbll) + "' ";
    s += "style='background-color:" + col + ";' ";
    s += " onmousedown='window.zbllClicked(\"" + oll + "\",\"" + coll + "\",\"" + zbll + "\")' class='zbllItem'>";
    s += "<img src='" + zbllSvg(oll, coll, zbll) + "' width='" + imgSize + "px'/>";
    s += "<br>" + zbll.replace("s", "/");
    return s + "</div>";
}

function ollItem(oll) // div
{
    var s = "";
    s += ollHeader(oll);
    s += "<div onmousedown='window.ollClicked(\"" + oll + "\")' class='ollItem'><img src='caseImage/ZBLS/level1/" + oll + ".png' width='" + imgSize + "px'/></div>";
    return s;
}

function collItem(oll, coll) // div
{
    var s = "";
    s += collHeader(oll, coll);
    s += "<div onmousedown='window.collClicked(\"" + oll + "\",\"" + coll + "\")' class='ollItem'><img src='caseImage/ZBLS/" + "level2" + "/"
            + oll+"-"+coll + ".png' width='" + imgSize + "px'/></div>";
    return s;
}

function ollHeader(oll) // div
{
    return "<div class='ollHeader' id='" +idHeaderOll(oll)+"' onclick='window.expandOll(\""+oll+"\")'>"+
            ollHeaderContent(oll,0) +"</div>";
}

function ollHeaderContent(oll, n) // text
{
    var total = (oll == "VHLS" ? 32 : (oll == "SlotBoth" ? 14 : (oll == "Pair" || oll == "Split" ? 80 : 48)));
    var collapseIconSpan = "<span id='collapseSpan-"+oll+"' style='float:right'>▼</span>";
    if (n == 0)
            return oll + " (0/" + total + ") " + collapseIconSpan;
    return oll + " (<b>" + n + "</b>/" + total + ") " + collapseIconSpan;
}

/// \param n number of cases selected
function collHeader(oll, coll) // div
{
    return "<div class='collHeader' id='" +idHeaderColl(oll, coll)+
            "'onclick='window.expandColl(\""+oll + "\",\"" + coll +"\")'>" +collHeaderContent(oll, coll, 0) +"</div>";
}

function collHeaderContent(oll, coll, n) // text
{
    let t = (oll == 'SlotBoth' ? ((coll == '38' || coll == '39') ? 4 : 2) : 8); // total
    if (n == 0)
        return coll + " (0/"+t+")";
    return coll + " (<b>" + n + "</b>/"+t+")";
}

/// returns COLL name of \param oll by number n (0 to 5)
function getCollByNum(oll, n)
{
    var ollMap = zblsMap[oll];
    var i = -1;
    for (var key in ollMap) {
        if (ollMap.hasOwnProperty(key)) {
            i++;
            if (i == n)
                return key;
        }
    }
    // console.error("getCollByNum: number is too high. Oll = " + oll + ", n = " + n);
    return "";
}

function changeVisib(el)
{
    if (el.style.visibility == "hidden" || el.style.visibility == "")
        el.style.visibility = "initial";
    else
        el.style.visibility = "hidden";
}

/* expand / collapse */
function expandOll(oll)
{
    var isCollapsed = false;
    // "td-" + oll + "-" + collName
    var ollMap = zblsMap[oll];
    for (var coll in ollMap) {
        if (ollMap.hasOwnProperty(coll)) {
            // expland or collapse
            let collElem = document.getElementById("td-" + oll + "-" + coll);
            changeVisib(collElem);
            if (collElem.style.visibility == "hidden" || collElem.style.visibility == "")
                isCollapsed = true;
        }
    }
    document.getElementById("collapseSpan-" + oll).innerHTML = isCollapsed ? "▼":"▲"
}

function expandColl(oll, coll)
{
    // pop-up zbll cases selection area for this coll
    displayZW(oll, coll);
}

/* cases selection */
// cliks on div, change style of <td>
function ollClicked(oll)
{
    selectAllOll(oll, !ollHasSelected(oll));
    renderSelection();
}

function collClicked(oll, coll)
{
    selectAllColl(oll, coll, !collHasSelected(oll, coll));
    renderSelection();
}

function zbllClicked(oll, coll, zbll)
{
    // change its color; do not render anything else
    var newVal = !(zblsMap[oll][coll][zbll]["c"]);
    // change color
    if (newVal)
        document.getElementById( idItemZbll(oll, coll, zbll) ).style.backgroundColor = colorAll;
    else
        document.getElementById( idItemZbll(oll, coll, zbll) ).style.backgroundColor = colorNone();

    zblsMap[oll][coll][zbll]["c"] = newVal;

    updateZwHeader(oll, coll);
}

/// \param c assign this boolean value to all zbll of \param oll (true=select all, false=unmark all)
function selectAllOll(oll, c)
{
    var ollMap = zblsMap[oll];
    for (var coll in ollMap) if (ollMap.hasOwnProperty(coll)) {
        let collMap = ollMap[coll];
        for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
            collMap[zbll]["c"] = c;
    }
}

/// \param c assign this boolean value to all zbll of \param oll (true=select all, false=unmark all)
function selectAllColl(oll, coll, c)
{
    var collMap = zblsMap[oll][coll];
    for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
        collMap[zbll]["c"] = c;
}

/// func is intended to be used in zw when clickced All or None. Elements are redrawed, no renderSelection() call needed
/// \param c assign this boolean value to all zbll of \param oll (true=select all, false=unmark all)
function selectAllZw(oll, coll, c)
{
    var collMap = zblsMap[oll][coll];
    for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
    {
        collMap[zbll]["c"] = c;
        // change color
        if (c)
            document.getElementById( idItemZbll(oll, coll, zbll) ).style.backgroundColor = colorAll;
        else
            document.getElementById( idItemZbll(oll, coll, zbll) ).style.backgroundColor = colorNone();
    }
    updateZwHeader(oll, coll);
}

/// \returns true if oll has some selected cases
function ollHasSelected(oll)
{
    var ollMap = zblsMap[oll];
    for (var coll in ollMap) if (ollMap.hasOwnProperty(coll)) {
        let collMap = ollMap[coll];
        for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
            if (collMap[zbll]["c"])
                return true;
    }
    return false;
}

/// \returns true if coll has some selected cases
function collHasSelected(oll, coll)
{
    var collMap = zblsMap[oll][coll];
    for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
        if (collMap[zbll]["c"])
            return true;
    return false;
}

/// short for howManyZbllsInCollSelected
function nZbllsInColl(oll, coll)
{
    var collMap = zblsMap[oll][coll];
    var n = 0;
    for (var zbll in collMap) if (collMap.hasOwnProperty(zbll))
        if (collMap[zbll]["c"])
            ++n;
    return n;
}


/* zbll selection popup window */
function displayZW(oll, coll)
{
    document.getElementById( "zbllWindowBack" ).style.display = 'initial';
    document.getElementById( "zbllWindow" ).style.display = 'initial';

    // fill the pictures
    var collMap = zblsMap[oll][coll];
    var s = "<span class='nw'>";
    var n = 0;
    for (var zbll in collMap) if (collMap.hasOwnProperty(zbll)) {
        s += zbllItem(oll, coll, zbll);
        if (!(++n%4))
            s += "</span><br><span class='nw'>";
    }
    document.getElementById( "zwPics" ).innerHTML = s; // this also deletes previous pics

    // header
    updateZwHeader(oll, coll);

    // assign selectAllZw() to buttons
    document.getElementById( "noneZwButton" ).onclick = function(){selectAllZw(oll, coll, false);};
    document.getElementById( "allZwButton" ).onclick = function(){selectAllZw(oll, coll, true);};
}

function updateZwHeader(oll, coll)
{
    let t = (oll == 'Inserted Both' ? ((coll == '38' || coll == '39') ? 4 : 2) : 8); // total
    document.getElementById( "zwHeaderMessage" ).innerHTML = coll + "(" + nZbllsInColl(oll, coll) + "/"+t+")";
}

function closeZW()
{
    if (document.getElementById( "zbllWindowBack" ).style.display != 'none')
    {
        document.getElementById( "zbllWindowBack" ).style.display = 'none';
        document.getElementById( "zbllWindow" ).style.display = 'none';
        renderSelection();
    }
}

window.expandOll = expandOll
window.expandColl = expandColl
window.zbllClicked = zbllClicked
window.collClicked = collClicked
window.ollClicked = ollClicked
window.adjustInfo = adjustInfo
window.closeZW = closeZW
// Listen for settings messages from parent page
window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'settingsAction') return;
    const { action, args } = e.data;
    if (action === 'adjustSize' && window.adjustSize) window.adjustSize(args[0], args[1]);
    if (action === 'toggleScrambleImg') {
        var img = document.getElementById('scrambleImg');
        if (img) {
            img.style.display = args[0] ? 'block' : 'none';
            if (args[0] && window.lastZbllCase) {
                var c = window.lastZbllCase;
                img.src = 'caseImage/ZBLS/level3/' + c.oll + '-' + c.coll + '-' + c.zbll.replace('/', 's') + '.png';
            }
        }
    }
    if (action === 'applyColor' && window.applystyle) {
        const ids = { bg: 'bgcolor_in', text: 'textcolor_in', links: 'linkscolor_in' };
        const el = document.getElementById(ids[args[0]]);
        if (el) { el.value = args[1]; window.applystyle(); }
    }
});

export { renderSelection, adjustInfo, closeZW, prepareMap, generateSelectionTable, loadSelection }