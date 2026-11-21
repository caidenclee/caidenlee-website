/**
 * @OnlyCurrentDoc
 * Practice log for caidenlee.com student pages: Google Doc version.
 *
 * Setup (on a computer):
 *   1. In your Google Doc, open Extensions > Apps Script.
 *   2. Delete what is there, paste all of this code, and click Save.
 *   3. Click Deploy > New deployment > Select type: Web app.
 *      Execute as: Me. Who has access: Anyone. Click Deploy and allow access.
 *   4. Copy the Web app URL and paste it into your student page.
 *
 * Each save adds or updates one section per day, newest on top.
 * This script can only touch this one document.
 */
function doPost(e) {
  var out;
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(20000);
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var days = (Array.isArray(data.days) ? data.days : []).filter(function (d) {
      return d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.date));
    });
    ensureTitle_(body, data.student);
    // Oldest first, so the newest day ends up on top.
    days.sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; });
    days.forEach(function (d) { writeDay_(body, d); });
    doc.saveAndClose();
    out = { ok: true, kind: 'doc', name: doc.getName(), saved: days.length };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  } finally {
    try { lock.releaseLock(); } catch (x) { /* not held */ }
  }
  return json_(out);
}

function doGet() {
  return json_({ ok: true, kind: 'doc', name: DocumentApp.getActiveDocument().getName() });
}

function para_(el) {
  return el.getType() === DocumentApp.ElementType.PARAGRAPH ? el.asParagraph() : null;
}

function ensureTitle_(body, student) {
  var first = para_(body.getChild(0));
  if (first && first.getHeading() === DocumentApp.ParagraphHeading.HEADING1) return;
  var title = (student ? student + '’s ' : '') + 'Practice Log';
  if (body.getNumChildren() === 1 && first && first.getText() === '') {
    first.setText(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  } else {
    body.insertParagraph(0, title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  }
}

function writeDay_(body, d) {
  var H1 = DocumentApp.ParagraphHeading.HEADING1;
  var H2 = DocumentApp.ParagraphHeading.HEADING2;
  var NORMAL = DocumentApp.ParagraphHeading.NORMAL;
  var label = String(d.label || d.date);
  var at = -1;
  for (var i = 0; i < body.getNumChildren(); i++) {
    var p = para_(body.getChild(i));
    if (p && p.getHeading() === H2 && p.getText() === label) { at = i; break; }
  }
  if (at >= 0) {
    // Remove the old section for this day: its heading up to the next heading.
    var end = at + 1;
    while (end < body.getNumChildren()) {
      var q = para_(body.getChild(end));
      if (q && (q.getHeading() === H2 || q.getHeading() === H1)) break;
      end++;
    }
    if (end >= body.getNumChildren()) body.appendParagraph(''); // a doc must end with a paragraph
    for (var k = end - 1; k >= at; k--) body.getChild(k).removeFromParent();
  } else {
    var top = para_(body.getChild(0));
    at = top && top.getHeading() === H1 ? 1 : 0;
  }
  var idx = at;
  body.insertParagraph(idx++, label).setHeading(H2);
  var bits = [(+d.done || 0) + ' of ' + (+d.total || 0) + ' drills'];
  if (+d.minutes > 0) bits.push(+d.minutes + ' min');
  if (+d.avg > 0) bits.push(+d.avg + ' avg');
  body.insertParagraph(idx++, bits.join(' · ')).setHeading(NORMAL);
  (Array.isArray(d.drills) ? d.drills : []).forEach(function (t) {
    body.insertListItem(idx++, String(t)).setGlyphType(DocumentApp.GlyphType.BULLET);
  });
  if (String(d.note || '').trim()) body.insertParagraph(idx++, 'Notes: ' + String(d.note).trim()).setHeading(NORMAL);
  body.insertParagraph(idx++, '').setHeading(NORMAL);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
