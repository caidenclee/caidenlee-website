/**
 * @OnlyCurrentDoc
 * Practice log for caidenlee.com student pages: Google Sheet version.
 *
 * Setup (on a computer):
 *   1. In your Google Sheet, open Extensions > Apps Script.
 *   2. Delete what is there, paste all of this code, and click Save.
 *   3. Click Deploy > New deployment > Select type: Web app.
 *      Execute as: Me. Who has access: Anyone. Click Deploy and allow access.
 *   4. Copy the Web app URL and paste it into your student page.
 *
 * Each save adds or updates one row per day on the "Practice Log" tab.
 * This script can only touch this one spreadsheet.
 */
var TAB = 'Practice Log';
var HEAD = ['Date', 'Day', 'Focus', 'Drills done', 'Drills', 'Minutes', 'Average', 'Notes', 'Saved'];

function doPost(e) {
  var out;
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(20000);
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = sheet_(ss);
    var days = (Array.isArray(data.days) ? data.days : []).filter(function (d) {
      return d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.date));
    });
    if (days.length) {
      var last = sh.getLastRow();
      var dates = last > 1 ? sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return r[0]; }) : [];
      days.forEach(function (d) {
        var row = [
          String(d.date),
          String(d.label || ''),
          String(d.focus || ''),
          (+d.done || 0) + ' of ' + (+d.total || 0),
          (Array.isArray(d.drills) ? d.drills : []).map(String).join('\n'),
          +d.minutes > 0 ? +d.minutes : '',
          +d.avg > 0 ? +d.avg : '',
          String(d.note || ''),
          new Date()
        ];
        var i = dates.indexOf(String(d.date));
        if (i >= 0) {
          sh.getRange(i + 2, 1, 1, HEAD.length).setValues([row]);
        } else {
          sh.getRange(sh.getLastRow() + 1, 1, 1, HEAD.length).setValues([row]);
          dates.push(String(d.date));
        }
      });
      if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).sort({ column: 1, ascending: false });
    }
    out = { ok: true, kind: 'sheet', name: ss.getName(), saved: days.length };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  } finally {
    try { lock.releaseLock(); } catch (x) { /* not held */ }
  }
  return json_(out);
}

function doGet() {
  return json_({ ok: true, kind: 'sheet', name: SpreadsheetApp.getActiveSpreadsheet().getName() });
}

function sheet_(ss) {
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB, 0);
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(5, 260);
    sh.setColumnWidth(8, 320);
    sh.getRange('E:E').setWrap(true);
    sh.getRange('H:H').setWrap(true);
    sh.getRange('I:I').setNumberFormat('mmm d, h:mm am/pm');
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
