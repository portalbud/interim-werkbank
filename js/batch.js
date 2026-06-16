// ── Batch CV Upload ───────────────────────────────────────────────────────────

function openBatchUploadDrawer() {
  BATCH = { bestanden: [], actief: true };
  document.getElementById('dTitle').textContent = 'CVs batch uploaden';
  document.getElementById('dSub').textContent = 'Upload meerdere CVs tegelijk. Elk CV wordt een aparte kandidaat.';
  renderBatchDrawer();
  document.getElementById('overlay').classList.add('show');
  document.getElementById('drawer').classList.add('show');
}

function renderBatchDrawer() {
  const body = document.getElementById('dBody');
  const klaar = BATCH.bestanden.filter(b => b.status === 'klaar');
  const wacht = BATCH.bestanden.filter(b => b.status === 'wacht');
  const bezig = BATCH.bestanden.filter(b => b.status === 'parsend').length;

  let h = '';
  h += '<div class="upload-zone" id="batchDrop" style="margin-bottom:16px">';
  h += '<strong>Sleep hier CV-bestanden</strong><br>';
  h += 'Word-documenten (.docx) - meerdere tegelijk. Elk bestand wordt een aparte kandidaat.';
  h += '</div>';
  h += '<input type="file" id="batchInput" multiple accept=".docx" style="display:none">';

  if (BATCH.bestanden.length) {
    h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">';
    if (wacht.length) h += '<button class="btn" onclick="batchParseer()">Analyseren met Claude (' + wacht.length + ' CVs)</button>';
    if (klaar.length) h += '<button class="btn" style="background:var(--moss-deep)" onclick="batchOpslaanAlle()">Alle opslaan (' + klaar.length + ' kandidaten)</button>';
    h += '<span style="font-size:12px;color:var(--slate)">' + BATCH.bestanden.length + ' bestand' + (BATCH.bestanden.length === 1 ? '' : 'en') + ' geladen' + (bezig ? ' - analyseren...' : '') + '</span>';
    h += '</div>';
    BATCH.bestanden.forEach((b, i) => { h += batchKaartje(b, i); });
  }

  body.innerHTML = h;
  wireBatchUpload();
}

function batchKaartje(b, i) {
  const p = b.parsed;
  const statusKleur = {
    wacht: 'color:var(--slate);background:#f0f0ec;border-color:#ccc',
    parsend: 'color:#8a6a18;background:#fbf3df;border-color:#d9c08a',
    klaar: 'color:var(--moss-deep);background:#e3eee4;border-color:#a9c4ad',
    fout: 'color:var(--rust);background:#f6e4dc;border-color:#dba893'
  }[b.status] || '';
  const statusLabel = { wacht: 'Wacht', parsend: 'Analyseren...', klaar: 'Klaar', fout: 'Fout' }[b.status] || b.status;

  let h = '<div class="panel" id="bk_' + i + '" style="margin-bottom:12px">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:' + (p ? '12' : '0') + 'px">';
  h += '<span style="font-family:var(--mono);font-size:11px;padding:2px 9px;border-radius:5px;border:1px solid;' + statusKleur + '">' + statusLabel + '</span>';
  h += '<span style="font-weight:600;font-size:13px;flex:1">' + esc(b.file.name) + '</span>';
  if (b.status === 'fout') h += '<span style="font-size:11.5px;color:var(--rust)">' + esc(b.foutmelding || '') + '</span>';
  h += '<button class="btn ghost sm" onclick="batchVerwijder(' + i + ')">Verwijderen</button>';
  h += '</div>';
  if (!p) return h + '</div>';

  h += '<div class="two-col">';
  h += veld('Naam', 'b_naam_' + i, p.naam || '', 'Volledige naam');
  h += veld('E-mail', 'b_email_' + i, p.email || '', 'emailadres@voorbeeld.nl');
  h += veld('Beschikbaar vanaf', 'b_besch_' + i, p.beschikbaar || '', 'bijv. 2026-07-01');
  h += veld('Tarief (EUR/uur)', 'b_tarief_' + i, p.tarief || '', '');
  h += veld('Locatie', 'b_loc_' + i, p.locatie || '', '');
  h += veld('Senioriteit', 'b_sen_' + i, p.senioriteit || 'Medior', '', true, ['Junior', 'Medior', 'Senior', 'Lead']);
  h += '</div>';
  h += veldFull('Rollen (komma-gescheiden)', 'b_rollen_' + i, (p.rollen || []).join(', '));
  h += veldFull('Skills (komma-gescheiden)', 'b_skills_' + i, (p.skills || []).join(', '));
  h += veldFull('Sectorervaring (komma-gescheiden)', 'b_sect_' + i, (p.sectoren || []).join(', '));
  h += veldFull('Profielschets', 'b_profiel_' + i, p.profiel || '', true);

  if (b.status === 'klaar') {
    h += '<div style="margin-top:10px;display:flex;gap:8px">';
    h += '<button class="btn sm" onclick="batchOpslaanEen(' + i + ')">Opslaan als kandidaat</button>';
    if (b.opgeslagen) h += '<span style="font-size:12px;color:var(--moss);margin-top:8px">Opgeslagen</span>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function wireBatchUpload() {
  const drop = document.getElementById('batchDrop');
  const inp = document.getElementById('batchInput');
  if (!drop || !inp) return;
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handleBatchFiles(e.dataTransfer.files); };
  inp.onchange = e => { handleBatchFiles(e.target.files); inp.value = ''; };
}

async function handleBatchFiles(files) {
  let toegevoegd = 0;
  for (const f of files) {
    if (f.name.split('.').pop().toLowerCase() !== 'docx') continue;
    if (BATCH.bestanden.some(b => b.file.name === f.name)) continue;
    toast('Inlezen: ' + f.name + '...', true);
    try {
      const tekst = await extractFileText(f);
      const b64 = await fileToBase64(f).catch(() => null);
      BATCH.bestanden.push({ file: f, tekst: tekst.slice(0, 9000), b64, status: 'wacht', parsed: null, opgeslagen: false });
      toegevoegd++;
    } catch(e) { BATCH.bestanden.push({ file: f, tekst: '', status: 'fout', parsed: null, foutmelding: e.message, opgeslagen: false }); }
  }
  toast(toegevoegd + ' CV' + (toegevoegd === 1 ? '' : 's') + ' ingelezen.');
  renderBatchDrawer();
}

function batchVerwijder(i) {
  BATCH.bestanden.splice(i, 1);
  renderBatchDrawer();
}

async function batchParseer() {
  const wacht = BATCH.bestanden.filter(b => b.status === 'wacht');
  if (!wacht.length) { toast('Geen CVs om te analyseren.'); return; }
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }

  const sys = 'Je extraheert gestructureerde kandidaatgegevens uit een CV-tekst. '
    + 'Houd je strikt aan wat er staat - verzin niets. Ontbrekende velden geef je als null of lege array. '
    + 'Geef punten in de ervaringslijst als korte feitelijke zinnen zonder clichés. '
    + 'Antwoord ALLEEN met geldige JSON zonder extra tekst of uitleg.';

  for (let i = 0; i < BATCH.bestanden.length; i++) {
    const b = BATCH.bestanden[i];
    if (b.status !== 'wacht') continue;
    b.status = 'parsend';
    renderBatchDrawer();
    try {
      const cvTekst = b.tekst
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        .slice(0, 7000);
      const usr = 'Parseer dit CV. Geef uitsluitend JSON in dit formaat:\n'
        + '{\n'
        + '  "naam": "string",\n'
        + '  "email": "string of null",\n'
        + '  "locatie": "string of null",\n'
        + '  "beschikbaar": "datum of null",\n'
        + '  "tarief": "getal of null",\n'
        + '  "senioriteit": "Junior of Medior of Senior of Lead",\n'
        + '  "rollen": ["string"],\n'
        + '  "skills": ["string"],\n'
        + '  "sectoren": ["string"],\n'
        + '  "profiel": "string",\n'
        + '  "motivatie": ["string"],\n'
        + '  "ervaring": [{"periode":"string","functie":"string","org":"string","punten":["string"]}],\n'
        + '  "opleiding": [{"jaar":"string","titel":"string","org":"string"}]\n'
        + '}\n\nCV TEKST:\n' + cvTekst;
      const raw = await claude(sys, usr, 2400);
      const r = pj(raw);
      if (r.tarief) r.tarief = parseFloat(String(r.tarief).replace(/[^0-9.,]/g, '').replace(',', '.')) || null;
      ['rollen', 'skills', 'sectoren', 'motivatie'].forEach(k => {
        if (!Array.isArray(r[k])) r[k] = r[k] ? [String(r[k])] : [];
      });
      if (!Array.isArray(r.ervaring)) r.ervaring = [];
      if (!Array.isArray(r.opleiding)) r.opleiding = [];
      b.parsed = r;
      b.status = 'klaar';
    } catch(e) { b.status = 'fout'; b.foutmelding = e.message; }
    renderBatchDrawer();
    await new Promise(res => setTimeout(res, 600));
  }
  toast('Analyse klaar.');
}

function batchLeesVelden(i) {
  const p = BATCH.bestanden[i].parsed;
  if (!p) return null;
  return {
    naam: document.getElementById('b_naam_' + i)?.value.trim() || '',
    email: document.getElementById('b_email_' + i)?.value.trim() || null,
    locatie: document.getElementById('b_loc_' + i)?.value.trim() || null,
    beschikbaar: document.getElementById('b_besch_' + i)?.value.trim() || null,
    tarief: parseFloat(document.getElementById('b_tarief_' + i)?.value) || null,
    senioriteit: document.getElementById('b_sen_' + i)?.value || 'Medior',
    rollen: document.getElementById('b_rollen_' + i)?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
    skills: document.getElementById('b_skills_' + i)?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
    sectoren: document.getElementById('b_sect_' + i)?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
    profiel: document.getElementById('b_profiel_' + i)?.value.trim() || '',
    motivatie: p.motivatie || [], ervaring: p.ervaring || [], opleiding: p.opleiding || [],
    opmerkingen: '',
    cv_bron: { naam: BATCH.bestanden[i].file.name, tekst: BATCH.bestanden[i].tekst, b64: BATCH.bestanden[i].b64 || null }
  };
}

async function batchOpslaanEen(i) {
  const b = BATCH.bestanden[i];
  if (b.opgeslagen) { toast('Al opgeslagen.'); return; }
  const velden = batchLeesVelden(i);
  if (!velden || !velden.naam) { toast('Naam is verplicht.'); return; }
  const kandidaat = { id: 'c_' + Date.now() + '_' + i, ...velden, reisbereidheid: 50 };
  try {
    if (BATCH.bestanden[i]?.file && kandidaat.cv_bron) {
      try {
        await DB.uploadBronCV(kandidaat.id, BATCH.bestanden[i].file);
        kandidaat.cv_bron.opgeslagen = true; kandidaat.cv_bron.rawBlob = null;
      } catch(upErr) { console.warn('Batch CV upload mislukt:', upErr.message); }
    }
    if (kandidaat.cv_bron) kandidaat.cv_bron = { naam: kandidaat.cv_bron.naam, tekst: kandidaat.cv_bron.tekst, opgeslagen: !!kandidaat.cv_bron.opgeslagen };
    await DB.upsertKandidaat(kandidaat);
    CANDIDATES = await DB.getKandidaten();
    b.opgeslagen = true;
    toast(velden.naam + ' opgeslagen.');
    renderBatchDrawer(); updateBadges();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function batchOpslaanAlle() {
  const klaar = BATCH.bestanden.filter(b => b.status === 'klaar' && !b.opgeslagen);
  if (!klaar.length) { toast('Niets te opslaan.'); return; }
  let opgeslagen = 0;
  for (let i = 0; i < BATCH.bestanden.length; i++) {
    const b = BATCH.bestanden[i];
    if (b.status !== 'klaar' || b.opgeslagen) continue;
    const velden = batchLeesVelden(i);
    if (!velden || !velden.naam) continue;
    try {
      await DB.upsertKandidaat({ id: 'c_' + Date.now() + '_' + i, ...velden, reisbereidheid: 50 });
      b.opgeslagen = true; opgeslagen++;
    } catch(e) { toast('Fout bij ' + (velden.naam || 'kandidaat') + ': ' + e.message); }
  }
  CANDIDATES = await DB.getKandidaten();
  CANDIDATES.forEach(herstelRawBlob);
  toast(opgeslagen + ' kandidat' + (opgeslagen === 1 ? '' : 'en') + ' opgeslagen.');
  updateBadges(); renderBatchDrawer();
}

// ── Dag Verwerking ────────────────────────────────────────────────────────────

function renderDagVerwerking() {
  document.getElementById('view').innerHTML = buildDagHtml();
  if (DAG.fase === 'idle') wireDagUpload();
}

function buildDagHtml() {
  let h = '';
  if (DAG.fase === 'idle' || DAG.fase === 'klaar') {
    h += `<div class="upload-zone" id="dagDrop" style="margin-bottom:16px">
      <strong>Sleep hier .eml of .msg bestanden van vandaag</strong><br>
      of een .zip van je volledige inbox - klik om te kiezen
    </div>
    <input type="file" id="dagInput" multiple accept=".eml,.msg,.txt,.zip" style="display:none">`;
    if (PENDING_MAILS.length) {
      h += `<div class="banner info" style="margin-bottom:16px">
        ${PENDING_MAILS.length} mail${PENDING_MAILS.length === 1 ? '' : 's'} geladen.
        De app filtert automatisch op relevantie, matcht de beste kandidaat per aanvraag,
        herschrijft het CV en zet een conceptmail klaar.
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn" onclick="startDagVerwerking()" id="btnDagStart">Verwerk ${PENDING_MAILS.length} mail${PENDING_MAILS.length === 1 ? '' : 's'} automatisch</button>
        <button class="btn ghost" onclick="PENDING_MAILS=[];renderDagVerwerking()">Wissen</button>
      </div>`;
    }
    if (DAG.wachtrij.length) h += buildReviewHtml();
    return h;
  }
  if (['analyseren', 'matchen', 'genereren'].includes(DAG.fase)) {
    const pct = DAG.totaal > 0 ? Math.round((DAG.voortgang / DAG.totaal) * 100) : 0;
    h += `<div style="max-width:600px">
      <div style="font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin-bottom:12px">
        ${DAG.fase === 'analyseren' ? 'Mails analyseren' : DAG.fase === 'matchen' ? 'Kandidaten matchen' : 'CV herschrijven en mail opstellen'}
      </div>
      <div style="background:var(--paper-2);border-radius:20px;height:8px;margin-bottom:12px;overflow:hidden">
        <div style="background:var(--moss);height:100%;width:${pct}%;transition:width .3s;border-radius:20px"></div>
      </div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:20px">${DAG.voortgang} van ${DAG.totaal} - ${pct}%</div>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto">
        ${DAG.log.slice(-20).map(l => `<div style="font-size:12px;color:${l.ok ? 'var(--moss-deep)' : 'var(--rust)'};font-family:var(--mono)">${l.ok ? 'v' : 'x'} ${esc(l.tekst)}</div>`).join('')}
      </div>
    </div>`;
    return h;
  }
  if (DAG.fase === 'review') h += buildReviewHtml();
  return h;
}

function buildReviewHtml() {
  const wacht = DAG.wachtrij.filter(w => w.status === 'wacht');
  const goed = DAG.wachtrij.filter(w => w.status === 'goedgekeurd');
  const over = DAG.wachtrij.filter(w => w.status === 'overgeslagen');
  const fout = DAG.wachtrij.filter(w => w.status === 'fout');
  let h = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:600">Ter goedkeuring</div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:2px">
        ${wacht.length} wacht - ${goed.length} goedgekeurd - ${over.length} overgeslagen${fout.length ? ' - ' + fout.length + ' mislukt' : ''}
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${wacht.length ? `<button class="btn" onclick="goedkeurAlle()">Alles goedkeuren (${wacht.length})</button>` : ''}
      ${goed.length ? `<button class="btn" style="background:var(--moss-deep)" onclick="zetAlleKlaar()">Klaarzetten in concepten (${goed.length})</button>` : ''}
      <button class="btn ghost" onclick="DAG={fase:'idle',voortgang:0,totaal:0,log:[],wachtrij:[]};PENDING_MAILS=[];renderDagVerwerking()">Nieuwe dag</button>
    </div>
  </div>`;
  if (!DAG.wachtrij.length) {
    return h + `<div class="empty"><div class="big">Geen relevante aanvragen gevonden</div>Alle mails waren niet-relevant of er waren geen geschikte kandidaten.</div>`;
  }
  h += DAG.wachtrij.map((w, i) => dagWachtrij(w, i)).join('');
  return h;
}

function dagWachtrij(w, i) {
  const statusKleur = { wacht: 'var(--slate)', goedgekeurd: 'var(--moss)', overgeslagen: '#aaa', fout: 'var(--rust)' }[w.status];
  const statusLabel = { wacht: 'Wacht op beoordeling', goedgekeurd: 'Goedgekeurd', overgeslagen: 'Overgeslagen', fout: 'Mislukt' }[w.status];
  if (w.status === 'fout') {
    return `<div class="panel" style="border-color:var(--rust);opacity:.7">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:600">${esc(w.aanvraag?.functietitel || w.aanvraag?.onderwerp || 'Aanvraag')}</div>
        <span style="font-size:11px;color:var(--rust)">${esc(w.foutmelding || 'Onbekende fout')}</span>
      </div>
    </div>`;
  }
  const r = w.aanvraag, m = w.match, c = m?.candidate;
  const dl = dlInfo(r?.deadline);
  return `<div class="panel" id="dagitem_${i}" style="border-color:${w.status === 'goedgekeurd' ? 'var(--moss)' : 'var(--line)'}">
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px">${esc(r.functietitel || r.onderwerp)}</div>
        <div style="font-size:12px;color:var(--ink-soft)">${esc(r.opdrachtgever || '')} ${r.locatie ? '- ' + esc(r.locatie) : ''} ${dl.txt !== '-' ? '- deadline ' + dl.txt : ''}</div>
      </div>
      <span style="font-family:var(--mono);font-size:10px;padding:3px 9px;border-radius:20px;border:1px solid;color:${statusKleur};border-color:${statusKleur}">${statusLabel}</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;background:var(--paper-2);border-radius:8px;padding:10px 12px;margin-bottom:12px">
      <div class="score-ring ${m.score >= 70 ? '' : m.score >= 45 ? 'mid' : 'low'}" style="--p:${m.score};width:38px;height:38px">
        <span style="width:28px;height:28px;font-size:11px">${m.score}</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:13px">${esc(c.naam)}</div>
        <div style="font-size:11.5px;color:var(--ink-soft)">${(c.rollen || []).join(' - ')} - beschikbaar ${esc(c.beschikbaar || '?')} - EUR ${c.tarief}</div>
      </div>
    </div>
    ${w.mailData ? `
    <div style="margin-bottom:12px">
      <div class="df"><label>Aan</label><input id="dag_to_${i}" value="${esc(w.mailData.to || r.van)}" onchange="DAG.wachtrij[${i}].mailData.to=this.value"></div>
      <div class="df"><label>Onderwerp</label><input id="dag_sub_${i}" value="${esc(w.mailData.onderwerp)}" onchange="DAG.wachtrij[${i}].mailData.onderwerp=this.value"></div>
      <div class="df"><label>Bericht</label><textarea id="dag_body_${i}" style="min-height:120px" onchange="DAG.wachtrij[${i}].mailData.body=this.value">${esc(w.mailData.body)}</textarea></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      ${w.docxUri ? `<button class="btn ghost sm" onclick="dagDownloadCV(${i})">CV downloaden (.docx)</button>` : ''}
      <span style="font-size:11.5px;color:var(--slate)">Controleer voor goedkeuring</span>
    </div>
    ` : ''}
    <div style="display:flex;gap:8px;border-top:1px dashed var(--line);padding-top:12px">
      ${w.status !== 'goedgekeurd' ? `<button class="btn sm" onclick="dagGoedkeuren(${i})">Goedkeuren</button>` : ''}
      ${w.status === 'goedgekeurd' ? `<button class="btn sm" style="background:var(--moss-deep)" onclick="dagKlaarzetten(${i})">Klaarzetten in concepten</button>` : ''}
      ${w.status !== 'overgeslagen' ? `<button class="btn ghost sm" onclick="dagOverslaan(${i})">Overslaan</button>` : ''}
      ${w.status === 'overgeslagen' ? `<button class="btn ghost sm" onclick="dagGoedkeuren(${i})">Toch goedkeuren</button>` : ''}
    </div>
  </div>`;
}

function dagGoedkeuren(i) { DAG.wachtrij[i].status = 'goedgekeurd'; renderDagVerwerking(); }
function dagOverslaan(i) { DAG.wachtrij[i].status = 'overgeslagen'; renderDagVerwerking(); }
function goedkeurAlle() { DAG.wachtrij.filter(w => w.status === 'wacht').forEach(w => w.status = 'goedgekeurd'); renderDagVerwerking(); }

function dagDownloadCV(i) {
  const w = DAG.wachtrij[i];
  if (!w.docxUri) { toast('Geen CV beschikbaar.'); return; }
  const a = document.createElement('a');
  a.href = w.docxUri;
  a.download = 'CV_' + w.match.candidate.naam.replace(/\s+/g, '_') + '.docx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function dagKlaarzetten(i) {
  const w = DAG.wachtrij[i];
  if (!w.mailData) { toast('Geen maildata beschikbaar.'); return; }
  try {
    await DB.saveConceptt({
      aanvraag_id: w.aanvraag.id || null,
      aanvraag_titel: w.aanvraag.functietitel || w.aanvraag.onderwerp,
      kandidaat_id: w.match.candidate.id, kandidaat_naam: w.match.candidate.naam,
      aan: w.mailData.to || w.aanvraag.van,
      onderwerp: w.mailData.onderwerp, body: w.mailData.body,
      cv_versie_id: null, cv_filename: 'CV_' + w.match.candidate.naam.replace(/\s+/g, '_') + '.docx', status: 'klaar'
    });
    CONCEPTEN = await DB.getConcepten();
    w.status = 'klaar'; updateBadges();
    toast('Concept klaargezet.'); renderDagVerwerking();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function zetAlleKlaar() {
  for (let i = 0; i < DAG.wachtrij.length; i++) {
    if (DAG.wachtrij[i].status === 'goedgekeurd') await dagKlaarzetten(i);
  }
  toast('Alle goedgekeurde concepten klaargezet.');
}

async function startDagVerwerking() {
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }
  if (!PENDING_MAILS.length) { toast('Geen mails geladen.'); return; }
  if (!CANDIDATES.length) { toast('Geen kandidaten in database.'); return; }

  DAG = { fase: 'analyseren', voortgang: 0, totaal: PENDING_MAILS.length, log: [], wachtrij: [] };
  renderDagVerwerking();

  dagLog('Mails analyseren...', true);
  let relevanteAanvragen = [];
  try {
    const filterRes = await quickFilter(PENDING_MAILS);
    const relevante = PENDING_MAILS.filter((_, i) => {
      const fr = filterRes.find(r => r.index === i); return fr && fr.relevant;
    });
    dagLog(relevante.length + ' relevante mails gevonden van ' + PENDING_MAILS.length, true);
    DAG.totaal = relevante.length; DAG.voortgang = 0;
    renderDagVerwerking();
    for (const mail of relevante) {
      try {
        const analyse = await analyseMail(mail);
        const rec = { id: 'r_' + mail.id, mail_id: mail.id, van: mail.from, ontvangen: mail.received, onderwerp: mail.subject, body: mail.body, ...analyse, status: 'geanalyseerd', duplicate_of: null, matches: null };
        await DB.upsertAanvraag(rec);
        relevanteAanvragen.push(rec);
        DAG.voortgang++;
        dagLog('Geanalyseerd: ' + (analyse.functietitel || mail.subject), true);
        renderDagVerwerking();
      } catch(e) { dagLog('Analyse mislukt: ' + mail.subject, false); DAG.voortgang++; }
    }
    AANVRAGEN = await DB.getAanvragen();
  } catch(e) { dagLog('Analysefase mislukt: ' + e.message, false); }

  if (!relevanteAanvragen.length) {
    dagLog('Geen relevante aanvragen gevonden.', true);
    DAG.fase = 'review'; renderDagVerwerking(); return;
  }

  DAG.fase = 'matchen'; DAG.totaal = relevanteAanvragen.length; DAG.voortgang = 0;
  renderDagVerwerking();
  const gematcht = [];
  for (const req of relevanteAanvragen) {
    try {
      dagLog('Matchen: ' + req.functietitel, true);
      const matches = await runMatching(req);
      const beste = matches.find(m => {
        if (m.score < 60) return false;
        const c = m.candidate;
        if (!c) return false;
        if (req.tarief_max) {
          const maxT = parseFloat(String(req.tarief_max).replace(/[^0-9.]/g, ''));
          if (maxT && c.tarief > maxT * 1.1) return false;
        }
        return true;
      }) || (matches[0]?.score >= 40 ? matches[0] : null);
      if (beste) {
        beste.candidate = CANDIDATES.find(c => c.id === beste.candidate_id) || beste.candidate;
        gematcht.push({ req, match: beste });
        dagLog('Match gevonden: ' + beste.candidate.naam + ' (score ' + beste.score + ')', true);
      } else {
        dagLog('Geen geschikte match voor: ' + req.functietitel, false);
        DAG.wachtrij.push({ aanvraag: req, match: null, status: 'fout', foutmelding: 'Geen kandidaat met score >= 40 gevonden' });
      }
      DAG.voortgang++; renderDagVerwerking();
    } catch(e) {
      dagLog('Match mislukt: ' + e.message, false);
      DAG.wachtrij.push({ aanvraag: req, match: null, status: 'fout', foutmelding: e.message });
      DAG.voortgang++;
    }
  }

  DAG.fase = 'genereren'; DAG.totaal = gematcht.length; DAG.voortgang = 0;
  renderDagVerwerking();
  for (const { req, match } of gematcht) {
    const cand = match.candidate;
    try {
      dagLog('CV herschrijven: ' + cand.naam + ' voor ' + req.functietitel, true);
      const cvData = await rewriteCV(req, cand);
      let docxBlob = null, docxUri = null;
      if (cand.cv_bron?.opgeslagen || cand.cv_bron?.rawBlob) {
        try {
          if (!cand.cv_bron.rawBlob) await laadRawBlob(cand);
          if (cand.cv_bron.rawBlob) {
            docxBlob = await herschrijfDocx(cand.cv_bron.rawBlob, cvData, cand);
            const ab = await docxBlob.arrayBuffer();
            docxUri = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + arrayBufferToBase64(ab);
            dagLog('CV gegenereerd als Word', true);
          }
        } catch(cvErr) { dagLog('Word genereren mislukt: ' + cvErr.message, false); }
      } else { dagLog('Geen bron-CV voor ' + cand.naam + ' - mail zonder CV-bijlage', false); }
      dagLog('Mail opstellen...', true);
      const mailResult = await generateMail(req, cand, match, cvData);
      const mailData = { to: req.van, onderwerp: mailResult.onderwerp, body: mailResult.body };
      DAG.wachtrij.push({ aanvraag: req, match, cvData, docxBlob, docxUri, mailData, status: 'wacht' });
      dagLog('Klaar: ' + req.functietitel + ' - ' + cand.naam, true);
      DAG.voortgang++; renderDagVerwerking();
    } catch(e) {
      dagLog('Genereren mislukt voor ' + req.functietitel + ': ' + e.message, false);
      DAG.wachtrij.push({ aanvraag: req, match, status: 'fout', foutmelding: e.message });
      DAG.voortgang++;
    }
  }
  AANVRAGEN = await DB.getAanvragen();
  PENDING_MAILS = [];
  DAG.fase = 'review';
  setBadge('b-dag', DAG.wachtrij.filter(w => w.status === 'wacht').length);
  renderDagVerwerking();
  toast('Verwerking klaar - ' + DAG.wachtrij.filter(w => w.status === 'wacht').length + ' aanvragen wachten op beoordeling.');
}

function dagLog(tekst, ok) { DAG.log.push({ tekst, ok }); }

function wireDagUpload() {
  const drop = document.getElementById('dagDrop'), inp = document.getElementById('dagInput');
  if (!drop || !inp) return;
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handleMailFiles(e.dataTransfer.files); setTimeout(() => renderDagVerwerking(), 100); };
  inp.onchange = e => { handleMailFiles(e.target.files); inp.value = ''; setTimeout(() => renderDagVerwerking(), 100); };
}

// ── Beschikbaarheidskalender ──────────────────────────────────────────────────

function renderKalender() {
  const el = document.getElementById('view');
  el.innerHTML = buildKalenderHtml();
  wireKalender();
}

function kalMaanden() {
  const nu = new Date();
  const startMaand = nu.getMonth();
  const startJaar = nu.getFullYear();
  const maanden = [];
  for (let m = startMaand; m <= 11; m++) maanden.push({ m: m + 1, j: startJaar });
  return maanden;
}

function buildKalenderHtml() {
  const maanden = kalMaanden();
  const huidigJaar = new Date().getFullYear();
  const volgendJaar = huidigJaar + 1;

  const ingeplandIds = new Set(KALENDER.map(e => e.kandidaat_id));
  const beschikbaar = CANDIDATES.filter(c => !ingeplandIds.has(c.id));
  const ingepland = CANDIDATES.filter(c => ingeplandIds.has(c.id));

  let sidebar = '<div class="kal-sidebar">';
  sidebar += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin-bottom:8px">Beschikbaar</div>';
  if (beschikbaar.length) {
    beschikbaar.forEach(c => {
      sidebar += '<div class="kal-cand-chip" draggable="true" id="kcand_' + c.id + '">';
      sidebar += '<span style="width:8px;height:8px;border-radius:50%;background:var(--moss);display:inline-block;flex-shrink:0"></span>';
      sidebar += esc(c.naam) + '</div>';
    });
  } else {
    sidebar += '<div style="font-size:11.5px;color:var(--slate)">Alle collegas ingepland.</div>';
  }
  if (ingepland.length) {
    sidebar += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin:14px 0 8px">Ingepland</div>';
    ingepland.forEach(c => {
      sidebar += '<div style="padding:6px 8px;font-size:12px;color:var(--ink-soft);border-radius:6px;background:var(--paper-2);margin-bottom:4px">' + esc(c.naam) + '</div>';
    });
  }
  sidebar += '<div style="margin-top:14px;font-size:11px;color:var(--slate)">Sleep naar een cel. Ingeplande collegas verschijnen grijs.</div>';
  sidebar += '</div>';

  const alleRollen = ROL_KOLOMMEN.concat(['Verlenging']);
  let tbl = '<div class="kal-wrap"><table class="kal-table"><thead><tr>';
  tbl += '<th class="maand-col">Maand</th>';
  ROL_KOLOMMEN.forEach(r => { tbl += '<th>' + esc(r) + '</th>'; });
  tbl += '<th>Verlenging</th></tr></thead><tbody>';

  let vorigJaar = null;
  maanden.forEach(mi => {
    const m = mi.m, j = mi.j;
    if (vorigJaar !== null && j !== vorigJaar) {
      tbl += '<tr><td colspan="' + (ROL_KOLOMMEN.length + 2) + '" style="background:var(--paper-2);font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--slate);padding:6px 12px;font-weight:600">' + j + '</td></tr>';
    }
    vorigJaar = j;
    tbl += '<tr class="' + (j === huidigJaar ? 'huidig-jaar' : 'volgend-jaar') + '">';
    tbl += '<td class="maand-cel">' + MAAND_NAMEN[m - 1] + '</td>';
    alleRollen.forEach(rol => {
      const celId = 'kalcel_' + m + '_' + j + '_' + rol.replace(/[^a-zA-Z0-9]/g, '_');
      const entries = KALENDER.filter(e => e.maand === m && e.jaar === j && e.rol === rol);
      tbl += buildKalCel(celId, m, j, rol, entries);
    });
    tbl += '</tr>';
  });

  const jaar2027 = volgendJaar;
  tbl += '<tr><td colspan="' + (ROL_KOLOMMEN.length + 2) + '" style="background:var(--paper-2);font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--slate);padding:6px 12px;font-weight:600">' + jaar2027 + '+ en later</td></tr>';
  tbl += '<tr class="volgend-jaar"><td class="maand-cel" style="font-size:11px;color:var(--slate)">' + jaar2027 + '+</td>';
  alleRollen.forEach(rol => {
    const celId = 'kalcel_2027_0_' + rol.replace(/[^a-zA-Z0-9]/g, '_');
    const entries = KALENDER.filter(e => e.jaar === jaar2027 && e.rol === rol);
    tbl += buildKalCel(celId, 1, jaar2027, rol, entries);
  });
  tbl += '</tr>';
  tbl += '</tbody></table></div>';
  return '<div style="display:flex;gap:20px;align-items:flex-start">' + sidebar + tbl + '</div>';
}

function buildKalCel(celId, m, j, rol, entries) {
  const nu = new Date();
  const huidigeM = nu.getMonth() + 1, huidigJ = nu.getFullYear();
  const isToekomst = (j > huidigJ) || (j === huidigJ && m >= huidigeM);
  const chipKlasse = isToekomst ? 'beschikbaar' : 'geplaatst';
  const celAchtergrond = isToekomst ? '' : 'background:var(--paper-2);';
  let cel = '<td id="' + celId + '" class="kaldroptarget" data-m="' + m + '" data-j="' + j + '" data-rol="' + esc(rol) + '" style="' + celAchtergrond + '"><div class="kal-cel">';
  entries.forEach(e => {
    const naam = e.kandidaat_naam || '?';
    cel += '<div class="kal-chip ' + chipKlasse + '" draggable="true" data-entry-id="' + e.id + '">';
    cel += esc(naam);
    cel += '<span class="rm" onclick="kalVerwijder(' + e.id + ')">x</span>';
    cel += '</div>';
  });
  cel += '<div class="kal-add" data-m="' + m + '" data-j="' + j + '" data-rol="' + esc(rol) + '" onclick="kalAddViaKlik(' + m + ',' + j + ',this.dataset.rol)">+</div>';
  cel += '</div></td>';
  return cel;
}

function wireKalender() {
  document.querySelectorAll('.kal-cand-chip').forEach(el => {
    el.addEventListener('dragstart', e => {
      const candId = el.id.replace('kcand_', '');
      const cand = CANDIDATES.find(c => c.id === candId);
      if (cand) KAL_DRAG = { type: 'nieuw', kandidaatId: cand.id, naam: cand.naam };
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  document.querySelectorAll('.kal-chip[data-entry-id]').forEach(el => {
    el.addEventListener('dragstart', e => {
      const eid = parseInt(el.dataset.entryId);
      const entry = KALENDER.find(x => x.id === eid);
      KAL_DRAG = { type: 'verplaats', entryId: eid, naam: entry ? entry.kandidaat_naam : '?' };
      e.dataTransfer.effectAllowed = 'move';
    });
  });
  document.querySelectorAll('.kaldroptarget').forEach(td => {
    td.addEventListener('dragover', e => { e.preventDefault(); td.querySelector('.kal-cel').classList.add('over'); });
    td.addEventListener('dragleave', () => td.querySelector('.kal-cel').classList.remove('over'));
    td.addEventListener('drop', e => {
      e.preventDefault();
      td.querySelector('.kal-cel').classList.remove('over');
      const m = parseInt(td.dataset.m), j = parseInt(td.dataset.j), rol = td.dataset.rol;
      kalDrop(e, m, j, rol);
    });
  });
}

function kalDragStart(event, kandidaatId, naam) { KAL_DRAG = { type: 'nieuw', kandidaatId, naam }; event.dataTransfer.effectAllowed = 'copy'; }
function kalChipDragStart(event, entryId, naam) { KAL_DRAG = { type: 'verplaats', entryId, naam }; event.dataTransfer.effectAllowed = 'move'; }

async function kalDrop(event, m, j, rol) {
  event.preventDefault();
  if (!KAL_DRAG) return;
  if (KAL_DRAG.type === 'nieuw') {
    await kalToevoegen(KAL_DRAG.kandidaatId, KAL_DRAG.naam, m, j, rol, 'beschikbaar');
  } else if (KAL_DRAG.type === 'verplaats') {
    const oude = KALENDER.find(e => e.id === KAL_DRAG.entryId);
    if (oude) {
      await kalVerwijder(oude.id, true);
      const cand = CANDIDATES.find(c => c.id === oude.kandidaat_id);
      if (cand) await kalToevoegen(cand.id, cand.naam, m, j, rol, oude.status);
    }
  }
  KAL_DRAG = null;
}

function kalBepaalRol(cand) {
  const rollen = (cand.rollen || []).map(r => r.toLowerCase());
  if (rollen.some(r => r.includes('scrum') || r.includes('agile'))) return 'Scrum Master';
  if (rollen.some(r => r.includes('product owner') || r.includes('po'))) return 'Product Owner';
  if (rollen.some(r => r.includes('project') || r.includes('program'))) return 'IT Projectmanager';
  if (rollen.some(r => r.includes('business') || r.includes('analist') || r.includes('process'))) return 'Business Analist / Process Manager';
  return ROL_KOLOMMEN[0];
}

async function kalToevoegen(kandidaatId, naam, m, j, rol, status = 'beschikbaar') {
  if (KALENDER.find(e => e.kandidaat_id === kandidaatId && e.maand === m && e.jaar === j && e.rol === rol)) {
    toast('Al ingepland in deze cel.'); return;
  }
  try {
    await DB.upsertKalender({ kandidaat_id: kandidaatId, kandidaat_naam: naam, maand: m, jaar: j, rol, status, bijgewerkt_op: new Date().toISOString() });
    KALENDER = await DB.getKalender();
    const cand = CANDIDATES.find(c => c.id === kandidaatId);
    if (cand) {
      const nieuweDatum = j + '-' + String(m).padStart(2, '0') + '-01';
      if (cand.beschikbaar !== nieuweDatum) {
        cand.beschikbaar = nieuweDatum;
        const opslaan = { ...cand, cv_bron: cand.cv_bron ? { naam: cand.cv_bron.naam, tekst: cand.cv_bron.tekst, opgeslagen: cand.cv_bron.opgeslagen } : null };
        await DB.upsertKandidaat(opslaan);
        CANDIDATES = await DB.getKandidaten();
        CANDIDATES.forEach(herstelRawBlob);
      }
    }
    renderKalender();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function kalVerwijder(id, stil = false) {
  try {
    await DB.deleteKalender(id);
    KALENDER = await DB.getKalender();
    if (!stil) renderKalender();
  } catch(e) { if (!stil) toast('Fout: ' + e.message); }
}

async function kalToggleStatus(id) {
  const entry = KALENDER.find(e => e.id === id);
  if (!entry) return;
  entry.status = entry.status === 'beschikbaar' ? 'geplaatst' : 'beschikbaar';
  try {
    await DB.upsertKalender({ ...entry, bijgewerkt_op: new Date().toISOString() });
    KALENDER = await DB.getKalender();
    renderKalender();
  } catch(e) { toast('Fout: ' + e.message); }
}

function kalAddViaKlik(m, j, rol) {
  if (!CANDIDATES.length) { toast('Geen kandidaten beschikbaar.'); return; }
  const naam = prompt('Naam van de collega:\n' + CANDIDATES.map(c => c.naam).join(', '));
  if (!naam) return;
  const cand = CANDIDATES.find(c => c.naam.toLowerCase() === naam.toLowerCase());
  if (!cand) { toast('Collega niet gevonden. Controleer de spelling.'); return; }
  kalToevoegen(cand.id, cand.naam, m, j, rol, 'beschikbaar');
}
