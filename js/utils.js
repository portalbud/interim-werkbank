// ── General utilities ────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let _tt = null;
function toast(msg, loading) {
  const t = document.getElementById('toast');
  t.innerHTML = (loading ? '<span class="spin"></span> ' : '') + esc(msg);
  t.classList.add('show');
  clearTimeout(_tt);
  if (!loading) _tt = setTimeout(() => t.classList.remove('show'), 2800);
}

function dlInfo(d) {
  if (!d) return { txt: '-', soon: false };
  let dt = null;
  const m = d.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; dt = new Date(y, +m[2]-1, +m[1]); }
  else if (/^\d{4}-\d{2}-\d{2}/.test(d)) dt = new Date(d);
  if (!dt || isNaN(dt)) return { txt: d, soon: false };
  const days = Math.ceil((dt - new Date()) / 864e5);
  return {
    txt: dt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + (days >= 0 ? ` (${days}d)` : ' verlopen'),
    soon: days <= 5 && days >= 0
  };
}

function setBadge(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

function updateBadges() {
  setBadge('b-vandaag', KANALEN.filter(k => (k.status === 'nieuw' || k.status === 'in_behandeling') && ROLLEN.find(r => r.id === k.rol_id)?.status !== 'gearchiveerd').length);
  setBadge('b-rollen', ROLLEN.filter(r => r.status === 'open').length);
}

// ── JSON parse with repair ───────────────────────────────────────────────────
function pj(txt) {
  let t = txt.replace(/```json/gi,'').replace(/```/g,'').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e >= 0) t = t.slice(s, e+1);
  try { return JSON.parse(t); } catch(e1) {}
  t = t.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
  t = t.replace(/,\s*([\]}])/g, '$1');
  try { return JSON.parse(t); } catch(e2) {}
  let repaired = t;
  const opens = [];
  let inStr = false, esc2 = false;
  for (let i = 0; i < repaired.length; i++) {
    const c = repaired[i];
    if (esc2) { esc2 = false; continue; }
    if (c === '\\' && inStr) { esc2 = true; continue; }
    if (c === '"' && !esc2) { inStr = !inStr; continue; }
    if (!inStr) {
      if (c === '{' || c === '[') opens.push(c);
      else if (c === '}' || c === ']') opens.pop();
    }
  }
  repaired = repaired.replace(/,\s*$/, '');
  for (let i = opens.length - 1; i >= 0; i--) repaired += opens[i] === '[' ? ']' : '}';
  try { return JSON.parse(repaired); } catch(e3) {
    throw new Error('JSON parse mislukt: ' + e3.message + ' (eerste 200 tekens: ' + t.slice(0,200) + ')');
  }
}

// ── File helpers ─────────────────────────────────────────────────────────────
function arrayBufferToBase64(buffer) {
  let bin = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.match(/.{1,76}/g).join('\r\n');
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('Lezen mislukt'));
    r.readAsDataURL(file);
  });
}

async function extractFileText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') return await file.text();
  if (ext === 'pdf') {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i);
      const tc = await pg.getTextContent();
      out += tc.items.map(it => it.str).join(' ') + '\n';
    }
    return out;
  }
  if (ext === 'docx') {
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  throw new Error('Onbekend bestandstype: .' + ext);
}

function listFromComma(id) {
  const el = document.getElementById(id);
  return el ? el.value.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// ── Form helpers ─────────────────────────────────────────────────────────────
function veld(label, id, val, ph = '', isSelect = false, opties = []) {
  if (isSelect) {
    return '<div class="field"><label>' + label + '</label><select id="' + id + '">'
      + opties.map(o => '<option' + (val === o ? ' selected' : '') + '>' + o + '</option>').join('')
      + '</select></div>';
  }
  return '<div class="field"><label>' + label + '</label>'
    + '<input id="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"></div>';
}

function veldFull(label, id, val, isTextarea = false) {
  if (isTextarea) {
    return '<div class="field"><label>' + label + '</label>'
      + '<textarea id="' + id + '" rows="2">' + esc(val) + '</textarea></div>';
  }
  return '<div class="field"><label>' + label + '</label>'
    + '<input id="' + id + '" value="' + esc(val) + '"></div>';
}

// ── Mail parsing ─────────────────────────────────────────────────────────────
function decodeMailHeader(h) {
  return h
    .replace(/=\?utf-8\?q\?([^?]+)\?=/gi, (_, enc) =>
      enc.replace(/_/g, ' ').replace(/=[0-9A-F]{2}/gi, m => String.fromCharCode(parseInt(m.slice(1), 16))))
    .replace(/=\?utf-8\?b\?([^?]+)\?=/gi, (_, enc) => atob(enc));
}

async function parseMail(file) {
  const name = file.name.toLowerCase();
  let raw = '', from = '', subject = '', body = '', date = '';
  if (name.endsWith('.eml')) {
    raw = await file.text();
    from    = (raw.match(/^From:\s*(.+)/mi) || [])[1] || file.name;
    subject = (raw.match(/^Subject:\s*(.+)/mi) || [])[1] || '(geen onderwerp)';
    date    = (raw.match(/^Date:\s*(.+)/mi) || [])[1] || new Date().toISOString();
    const bi = raw.indexOf('\r\n\r\n') >= 0 ? raw.indexOf('\r\n\r\n') + 4 : raw.indexOf('\n\n') + 2;
    body = raw.slice(bi)
      .replace(/=\r?\n/g, '')
      .replace(/=[0-9A-F]{2}/gi, m => String.fromCharCode(parseInt(m.slice(1), 16)))
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim()
      .slice(0, 6000);
  } else if (name.endsWith('.msg')) {
    const buf = await file.arrayBuffer();
    const dec = new TextDecoder('utf-8', { fatal: false });
    raw = dec.decode(buf).replace(/\x00/g, '');
    subject = file.name.replace('.msg', '');
    from = file.name;
    body = raw.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{4,}/g, '\n').trim().slice(0, 4000);
    date = new Date().toISOString();
  } else if (name.endsWith('.txt')) {
    body = await file.text(); subject = file.name; from = 'upload'; date = new Date().toISOString();
  }
  return {
    id: 'mail_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    from: from.trim(),
    subject: decodeMailHeader(subject.trim()),
    body: body.trim(),
    received: new Date(date).toISOString() || new Date().toISOString(),
    filename: file.name
  };
}

async function extractZip(file) {
  if (typeof JSZip === 'undefined') { toast('JSZip niet geladen - sleep losse .eml bestanden.'); return []; }
  const zip = await JSZip.loadAsync(file);
  const mails = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const ext = name.split('.').pop().toLowerCase();
    if (!['eml', 'msg', 'txt'].includes(ext)) continue;
    const blob = await entry.async('blob');
    const f = new File([blob], name, { type: 'text/plain' });
    mails.push(await parseMail(f));
  }
  return mails;
}

// ── Mail file handler (shared between views) ─────────────────────────────────
async function handleMailFiles(files) {
  toast('Bestanden inlezen…', true);
  let added = 0;
  for (const f of files) {
    try {
      if (f.name.toLowerCase().endsWith('.zip')) {
        const mails = await extractZip(f);
        mails.forEach(m => { PENDING_MAILS.push(m); added++; });
      } else {
        PENDING_MAILS.push(await parseMail(f));
        added++;
      }
    } catch(e) { toast('Kon ' + f.name + ' niet lezen: ' + e.message); }
  }
  toast(`${added} mail${added === 1 ? '' : 's'} toegevoegd.`);
  renderView();
}

function togglePendingMail(i, checked) {
  if (!checked) PENDING_MAILS[i]._skip = true;
  else delete PENDING_MAILS[i]._skip;
}

// ── DOCX text engine ─────────────────────────────────────────────────────────
function docxGetText(xmlStr) {
  const texts = [];
  const matches = xmlStr.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  for (const m of matches) texts.push(m[1]);
  return texts.join(' ');
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlReplaceText(xmlStr, oudeTekst, nieuweTekst) {
  if (!oudeTekst || !nieuweTekst || oudeTekst === nieuweTekst) return xmlStr;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const zoek = norm(oudeTekst);
  if (!zoek) return xmlStr;
  const escaped = zoek.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = new RegExp('(<w:t[^>]*>)' + escaped + '(<\\/w:t>)', 'g');
  if (direct.test(xmlStr)) return xmlStr.replace(direct, '$1' + escXml(nieuweTekst) + '$2');
  return xmlStr.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, para => {
    const flatText = norm(docxGetText(para));
    if (!flatText.includes(zoek)) return para;
    const runs = [...para.matchAll(/<w:t([^>]*)>([^<]*)<\/w:t>/g)];
    if (!runs.length) return para;
    const combined = runs.map(r => r[2]).join('');
    const normCombined = norm(combined);
    if (!normCombined.includes(zoek)) return para;
    let result = para;
    result = result.replace(/<w:t([^>]*)>[^<]*<\/w:t>/, '<w:t$1>' + escXml(nieuweTekst) + '</w:t>');
    let first = true;
    result = result.replace(/<w:t([^>]*)>[^<]*<\/w:t>/g, m => {
      if (first) { first = false; return m; }
      return m.replace(/<w:t([^>]*)>[^<]*<\/w:t>/, '<w:t$1></w:t>');
    });
    return result;
  });
}

async function herschrijfDocx(origBlob, cvData, cand) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip niet geladen');
  let zipInput = origBlob;
  if (origBlob instanceof Blob || origBlob instanceof File) zipInput = await origBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(zipInput);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Geen word/document.xml gevonden in dit bestand');
  let xml = await docFile.async('string');
  if (cvData.oud_functietitel && cvData.functietitel)
    xml = xmlReplaceText(xml, cvData.oud_functietitel, cvData.functietitel);
  if (cvData.naam_weergave && cvData.naam_weergave !== cand.naam)
    xml = xmlReplaceText(xml, cand.naam, cvData.naam_weergave);
  if (cvData.oud_kopprofiel && cvData.kopprofiel)
    xml = xmlReplaceText(xml, cvData.oud_kopprofiel, cvData.kopprofiel);
  const oudKK = cvData.oud_kernkwaliteiten || [];
  const nieuwKK = cvData.kernkwaliteiten || [];
  for (let k = 0; k < Math.min(oudKK.length, nieuwKK.length); k++)
    if (oudKK[k] && nieuwKK[k]) xml = xmlReplaceText(xml, oudKK[k], nieuwKK[k]);
  for (const erv of (cvData.ervaring || [])) {
    if (erv.oud_functie && erv.functie && erv.oud_functie !== erv.functie)
      xml = xmlReplaceText(xml, erv.oud_functie, erv.functie);
    const oudP = erv.oud_punten || [], nieuwP = erv.punten || [];
    for (let p = 0; p < Math.min(oudP.length, nieuwP.length); p++)
      if (oudP[p] && nieuwP[p] && oudP[p] !== nieuwP[p]) xml = xmlReplaceText(xml, oudP[p], nieuwP[p]);
  }
  zip.file('word/document.xml', xml);
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

async function maakDocx(tekst) {
  if (typeof docx !== 'undefined') {
    try {
      const regels = tekst.split('\n');
      const paragrafen = regels.map(r => new docx.Paragraph({
        children: [new docx.TextRun({ text: r || ' ', size: 22, font: 'Calibri' })],
        spacing: { after: 120 }
      }));
      const doc = new docx.Document({ sections: [{ children: paragrafen }] });
      return await docx.Packer.toBlob(doc);
    } catch(e) { /* fallback */ }
  }
  const escaped = tekst.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const regels = escaped.split('\n');
  const paraXml = regels.map(r => `<w:p><w:r><w:t xml:space="preserve">${r || ' '}</w:t></w:r></w:p>`).join('');
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paraXml}<w:sectPr/></w:body></w:document>`;
  if (typeof JSZip !== 'undefined') {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/document.xml', docXml);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  const rtf = '{\\rtf1\\ansi\n' + regels.map(r => r + '\\par\n').join('') + '}';
  return new Blob([rtf], { type: 'application/rtf' });
}

function maakXlsx(tekst) {
  if (typeof XLSX === 'undefined') return new Blob([tekst], { type: 'text/plain;charset=utf-8' });
  const regels = tekst.split('\n').map(r => [r]);
  const ws = XLSX.utils.aoa_to_sheet(regels);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Aanbieding');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
