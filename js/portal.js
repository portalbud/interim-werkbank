// ── Portal Buddy ──────────────────────────────────────────────────────────────

function renderPortalBuddy() {
  const el = document.getElementById('view');
  el.innerHTML = buildPBHtml();
  wirePBDoc();
}

function buildPBHtml() {
  const p = PB.parsed;
  let h = '';

  h += '<div class="section-label" style="margin-top:0">Stap 1 - Plak de aanvraag uit het portal</div>';
  h += '<div class="panel">';
  h += '<div class="field"><label>Aanvraag tekst</label>';
  h += '<textarea id="pb_tekst" rows="10" style="font-size:13px;line-height:1.55" placeholder="Plak hier de volledige aanvraag tekst uit het portal...">' + esc(PB.aanvraagTekst) + '</textarea></div>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<button class="btn" onclick="pbAnalyse()">Analyseren</button>';
  if (p) {
    h += '<span style="font-size:12px;color:var(--moss)">Geanalyseerd: <b>' + esc(p.functietitel || '') + '</b></span>';
    const alOpgeslagen = PB.reqId && AANVRAGEN.find(a => a.id === PB.reqId);
    h += '<button class="btn ghost sm" onclick="pbVoegToeAanAanvragen()" ' + (alOpgeslagen ? 'disabled' : '') + ' style="margin-left:auto">' + (alOpgeslagen ? 'Toegevoegd aan aanvragen' : 'Toevoegen aan aanvragen (Portal)') + '</button>';
  }
  h += '</div></div>';
  if (!p) return h;

  h += '<div class="section-label">Aanvraag - gestructureerd</div>';
  h += '<div class="panel"><dl class="kv">';
  h += '<dt>Functietitel</dt><dd>' + esc(p.functietitel || '-') + '</dd>';
  h += '<dt>Opdrachtgever</dt><dd>' + esc(p.opdrachtgever || '-') + '</dd>';
  h += '<dt>Locatie</dt><dd>' + esc(p.locatie || '-') + '</dd>';
  h += '<dt>Start</dt><dd>' + esc(p.startdatum || '-') + '</dd>';
  h += '<dt>Duur</dt><dd>' + esc(p.duur || '-') + '</dd>';
  h += '<dt>Uren/week</dt><dd>' + esc(p.uren_per_week || '-') + '</dd>';
  h += '<dt>Max tarief</dt><dd>' + esc(p.tarief_max || '-') + '</dd>';
  h += '<dt>Deadline</dt><dd>' + esc(p.deadline || '-') + '</dd>';
  h += '</dl>';
  if ((p.eisen || []).length) {
    h += '<div style="margin-top:10px"><b style="font-size:12px">Eisen</b><div class="chips">'
      + p.eisen.map(e => '<span class="chip req">' + esc(e) + '</span>').join('') + '</div></div>';
  }
  if ((p.wensen || []).length) {
    h += '<div style="margin-top:8px"><b style="font-size:12px">Wensen</b><div class="chips">'
      + p.wensen.map(e => '<span class="chip">' + esc(e) + '</span>').join('') + '</div></div>';
  }
  h += '</div>';

  h += '<div class="section-label">Stap 2 - Kandidaten selecteren</div>';
  if (!PB.matches.length) {
    h += '<div class="panel"><button class="btn" onclick="pbMatch()">Matchen met Claude (' + CANDIDATES.length + ' kandidaten)</button>'
      + '<p style="font-size:12px;color:var(--slate);margin-top:8px">Claude scoort alle kandidaten op deze aanvraag.</p></div>';
  } else {
    h += '<div class="panel"><p style="font-size:12px;color:var(--ink-soft);margin-top:0">Selecteer één of meer kandidaten om voor te stellen.</p>';
    h += PB.matches.map((m, i) => pbMatchCard(m, i)).join('');
    if (PB.geselecteerd.length) {
      h += '<div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)">'
        + '<button class="btn" onclick="pbGenereer()">CVs herschrijven voor geselecteerde kandidaten (' + PB.geselecteerd.length + ')</button></div>';
    }
    h += '</div>';
  }

  h += '<div class="section-label">Stap 3 - Aanbiedingsdocument (optioneel)</div>';
  h += '<div class="panel">';
  h += '<p style="font-size:12.5px;color:var(--ink-soft);margin-top:0">Upload het blanco aanbiedingsdocument van de klant of broker (Excel of Word). De app vult het in op basis van de aanvraag en het kandidaatprofiel.</p>';
  h += '<div class="upload-zone" id="pbDocDrop">' + (PB.docFilename ? 'Huidig: <b>' + esc(PB.docFilename) + '</b> - klik om te vervangen' : 'Sleep hier het blanco aanbiedingsdocument (.docx, .xlsx, .xls, .txt) of klik') + '</div>';
  h += '<input type="file" id="pbDocInput" accept=".docx,.xlsx,.xls,.txt,.pdf" style="display:none">';
  if (PB.docFilename) {
    h += '<div class="filechip">' + esc(PB.docFilename) + ' <span class="x" onclick="pbClearDoc()">&#215;</span></div>';
  }
  h += '</div>';

  if (Object.keys(PB.resultaten).length) {
    h += '<div class="section-label">Stap 4 - Resultaten</div>';
    PB.geselecteerd.forEach(cid => {
      const res = PB.resultaten[cid];
      if (!res) return;
      const cand = CANDIDATES.find(c => c.id === cid);
      if (!cand) return;
      h += pbResultCard(cand, res);
    });
  }

  return h;
}

function pbMatchCard(m, i) {
  const c = CANDIDATES.find(x => x.id === m.candidate_id);
  if (!c) return '';
  const sel = PB.geselecteerd.includes(c.id);
  const cls = m.score >= 70 ? '' : m.score >= 45 ? 'mid' : 'low';
  return '<div class="match" style="' + (sel ? 'border-color:var(--moss);background:#f4f9f4' : '') + '">'
    + '<div class="match-top">'
    + '<div class="score-ring ' + cls + '" style="--p:' + m.score + '"><span>' + m.score + '</span></div>'
    + '<div style="flex:1">'
    + '<div style="font-weight:700;font-size:14px">' + esc(c.naam) + '</div>'
    + '<div style="font-size:12px;color:var(--ink-soft)">' + (c.rollen || []).join(' · ') + ' · &euro;' + c.tarief + ' · beschikbaar ' + esc(c.beschikbaar || '?') + '</div>'
    + '</div>'
    + '<button class="btn ' + (sel ? 'danger' : 'ghost') + ' sm" onclick="pbToggle(\'' + c.id + '\')">' + (sel ? 'Deselecteer' : 'Selecteer') + '</button>'
    + '</div>'
    + '<div class="reasoning">'
    + '<div class="col pro"><h4>Passend</h4><ul>' + (m.pro || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
    + '<div class="col risk"><h4>Risico</h4><ul>' + (m.risico || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
    + '<div class="col covered"><h4>Eisen afgedekt</h4><ul>' + (m.eisen_afgedekt || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
    + '<div class="col missing"><h4>Ontbreekt</h4><ul>' + (m.ontbreekt || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
    + '</div>'
    + '</div>';
}

function pbResultCard(cand, res) {
  if (res.fout) {
    return '<div class="panel" id="pbres_' + cand.id + '"><h3>' + esc(cand.naam) + '</h3>'
      + '<div class="banner warn">' + esc(res.fout) + ' <label style="cursor:pointer;text-decoration:underline">Klik hier om .docx te uploaden<input type="file" accept=".docx" style="display:none" onchange="pbInlineUpload(event,&quot;' + cand.id + '&quot;)"></label></div></div>';
  }
  const sigs = (res.cvData && res.cvData.signalen) || [];
  return '<div class="panel" id="pbres_' + cand.id + '">'
    + '<h3>' + esc(cand.naam) + '</h3>'
    + (sigs.length ? '<div class="banner warn">Te checken: ' + sigs.map(esc).join(' · ') + '</div>' : '')
    + '<div class="field" style="margin-bottom:14px">'
    + '<label>Leveranciersopmerking <span style="font-weight:400;color:var(--slate)">(informeel, apart vak - niet in CV of document)</span></label>'
    + '<textarea id="pb_opm_' + cand.id + '" rows="3" placeholder="Bv: Sanne heeft precies de combinatie van Power BI en HR-data die jullie zoeken." style="font-size:13px">' + esc(res.opmerking || '') + '</textarea>'
    + '<button class="btn ghost sm" style="margin-top:6px" onclick="pbGenereerOpmerking(\'' + cand.id + '\')">Genereer opmerking</button>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
    + '<button class="btn sm" onclick="pbDownloadCVWord(\'' + cand.id + '\')">Word downloaden</button>'
    + '</div>'
    + '<div id="pbcvprev_' + cand.id + '"></div>'
    + (res.docFilled
      ? '<div style="margin-top:4px">'
        + '<div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--ink-soft)">Aanbiedingsdocument (ingevuld)</div>'
        + '<div class="banner info" style="font-size:12px">Persoonlijke gegevens (BSN, adres, geboortedatum) zijn bewust leeggelaten.</div>'
        + '<span class="attach" onclick="pbDownloadDoc(\'' + cand.id + '\')">' + esc(res.docFilename || 'Aanbieding.txt') + '</span>'
        + '</div>'
      : (PB.docFile
        ? '<button class="btn ghost sm" onclick="pbVulDocIn(\'' + cand.id + '\')">Aanbiedingsdocument invullen</button>'
        : '<span style="font-size:12px;color:var(--slate)">Geen aanbiedingsdocument geüpload (optioneel).</span>')
    )
    + '<div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<button class="btn' + (res.toegevoegdAanConcepten ? ' ghost' : '') + '" onclick="pbNaarConcepten(\'' + cand.id + '\')" ' + (res.toegevoegdAanConcepten ? 'disabled' : '') + '>'
    + (res.toegevoegdAanConcepten ? 'Toegevoegd aan concepten' : 'Toevoegen aan concepten')
    + '</button>'
    + '<span style="font-size:11.5px;color:var(--slate)">Slaat het CV en de opmerking op als concept voor verdere verwerking.</span>'
    + '</div>'
    + '</div>';
}

async function pbAnalyse() {
  const txt = document.getElementById('pb_tekst')?.value.trim();
  if (!txt) { toast('Plak eerst een aanvraag tekst.'); return; }
  PB.aanvraagTekst = txt;
  PB.parsed = null; PB.matches = []; PB.geselecteerd = []; PB.resultaten = {};
  toast('Aanvraag analyseren…', true);
  try {
    const sys = 'Je analyseert interim-aanvragen. Antwoord ALLEEN geldige JSON.';
    const usr = 'Analyseer en geef JSON:{"functietitel":str,"klant":str,"locatie":str,"startdatum":str,"duur":str,"uren_per_week":str,"tarief_max":str,"deadline":str,"eisen":[str],"wensen":[str],"role_type":"agile|projectmanagement|process|business|overig"}\n\nTEKST:\n' + txt;
    PB.parsed = pj(await claude(sys, usr, 1400));
    PB.reqId = null;
    toast('Aanvraag geanalyseerd.');
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function pbVoegToeAanAanvragen() {
  if (!PB.parsed) { toast('Analyseer eerst de aanvraag.'); return; }
  const reqId = PB.reqId || ('portal_' + Date.now());
  PB.reqId = reqId;
  const pbRec = {
    id: reqId, mail_id: null, van: '[Portal aanvraag]',
    ontvangen: new Date().toISOString(),
    onderwerp: '[Portal] ' + (PB.parsed.functietitel || 'Aanvraag'),
    body: PB.aanvraagTekst, is_relevant: true, bron: 'portal',
    ...PB.parsed, status: 'geanalyseerd', duplicate_of: null, matches: null
  };
  try {
    await DB.upsertAanvraag(pbRec);
    AANVRAGEN = await DB.getAanvragen();
    toast('Rol toegevoegd aan aanvragen (Portal).');
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function pbMatch() {
  if (!PB.parsed) { toast('Analyseer eerst de aanvraag.'); return; }
  toast('Matchen…', true);
  try {
    const req = PB.parsed;
    const cs = CANDIDATES.map(c => '[' + c.id + '] ' + c.naam
      + ' | rollen:' + (c.rollen || []).join(',')
      + ' | skills:' + (c.skills || []).join(',')
      + ' | sectoren:' + (c.sectoren || []).join(',')
      + ' | locatie:' + c.locatie + ' reisbereid ' + (c.reisbereidheid || 0) + 'km'
      + ' | ' + c.senioriteit + ' | €' + c.tarief + ' | beschikbaar ' + (c.beschikbaar || '?')).join('\n');
    const sys = 'Je bent matching-specialist interim-bureau. Eerlijke scores 0-100. Knock-out eisen die ontbreken verlagen sterk. ALLEEN geldige JSON.';
    const usr = 'AANVRAAG: ' + req.functietitel + ' | ' + (req.locatie || '?') + ' | max €' + (req.tarief_max || '?')
      + '\nEisen: ' + (req.eisen || []).join(' | ') + '\nWensen: ' + (req.wensen || []).join(' | ')
      + '\n\nKANDIDATEN:\n' + cs
      + '\n\nGeef JSON:\n{"matches":[{"candidate_id":"","score":0,"pro":[str],"risico":[str],"eisen_afgedekt":[str],"wensen_afgedekt":[str],"ontbreekt":[str]}]}\nSorteer aflopend score. Alleen score>=25.';
    const r = pj(await claude(sys, usr, 2400));
    PB.matches = (r.matches || []).filter(m => CANDIDATES.find(c => c.id === m.candidate_id));
    toast('Matching klaar.');
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}

function pbToggle(cid) {
  const idx = PB.geselecteerd.indexOf(cid);
  if (idx >= 0) PB.geselecteerd.splice(idx, 1);
  else PB.geselecteerd.push(cid);
  renderPortalBuddy();
}

async function pbGenereer() {
  if (!PB.geselecteerd.length) { toast('Selecteer eerst een kandidaat.'); return; }
  for (const cid of PB.geselecteerd) {
    if (PB.resultaten[cid]?.cvData) continue;
    const cand = CANDIDATES.find(c => c.id === cid);
    if (!cand) continue;
    toast('CV herschrijven voor ' + cand.naam + '…', true);
    try {
      const req = { ...PB.parsed, cv_instructies: PB.parsed.cv_instructies || {} };
      const cvData = await rewriteCV(req, cand);
      const versieNr = await DB.getNextCVVersie(cand.id);
      const pbBaseName = 'CV_' + cand.naam.replace(/\s+/g, '_') + '_v' + versieNr;
      if (!cand.cv_bron?.rawBlob) {
        toast('Bron-CV ophalen voor ' + cand.naam + '...', true);
        const ok = await laadRawBlob(cand);
        if (!ok) {
          PB.resultaten[cid] = { fout: 'Bron-CV niet beschikbaar voor ' + cand.naam + '. Open de kandidaat en upload het .docx bestand opnieuw.' };
          continue;
        }
      }
      toast('Word herschrijven…', true);
      const docxBlob = await herschrijfDocx(cand.cv_bron.rawBlob, cvData, cand);
      const ab = await docxBlob.arrayBuffer();
      const docxUri = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + arrayBufferToBase64(ab);
      let docxUrl = null;
      try {
        docxUrl = await DB.uploadDocx(cand.id, versieNr, docxBlob);
        await DB.saveCVVersie({ kandidaat_id: cand.id, versie: versieNr, gemaakt_voor: PB.parsed.functietitel, aanvraag_id: null, cv_data: cvData, pdf_url: docxUrl || '' });
      } catch(storageErr) { console.warn('Storage upload mislukt:', storageErr.message); }
      PB.resultaten[cid] = {
        cvData, docxBlob, docxUri, docxUrl,
        effectiefUrl: docxUri,
        cvFilename: pbBaseName + '.docx',
        versieNr, opmerking: '',
        docFilled: false, docFilename: '', docContent: ''
      };
    } catch(e) { toast('Fout CV ' + cand.naam + ': ' + e.message); }
  }
  toast('CVs klaar.');
  renderPortalBuddy();
}

async function pbInlineUpload(event, cid) {
  const file = event.target.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.docx')) { toast('Alleen .docx bestanden.'); return; }
  toast('CV uploaden...', true);
  try {
    const txt = await extractFileText(file);
    const cand = CANDIDATES.find(c => c.id === cid);
    if (!cand) { toast('Kandidaat niet gevonden.'); return; }
    await DB.uploadBronCV(cand.id, file);
    cand.cv_bron = { naam: file.name, tekst: txt.slice(0, 9000), opgeslagen: true, rawBlob: file };
    const opslaan = { ...cand, cv_bron: { naam: file.name, tekst: txt.slice(0, 9000), opgeslagen: true } };
    await DB.upsertKandidaat(opslaan);
    CANDIDATES = await DB.getKandidaten();
    const updated = CANDIDATES.find(c => c.id === cid);
    if (updated) updated.cv_bron.rawBlob = file;
    delete PB.resultaten[cid];
    toast('Bron-CV opgeslagen. Druk opnieuw op CV herschrijven.');
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function pbGenereerOpmerking(cid) {
  const cand = CANDIDATES.find(c => c.id === cid);
  const res = PB.resultaten[cid];
  if (!cand || !res) { toast('Genereer eerst het CV.'); return; }
  const match = PB.matches.find(m => m.candidate_id === cid) || {};
  toast('Opmerking genereren…', true);
  try {
    const sys = 'Je schrijft een korte, informele leveranciersopmerking waarmee een interim-bureau uitlegt waarom een kandidaat goed past op een opdracht. Maximaal 3 zinnen. Geen clichés, geen verkooptaal. Concreet en persoonlijk. Antwoord ALLEEN met de tekst, geen JSON.';
    const usr = 'AANVRAAG: ' + PB.parsed.functietitel + ' | ' + (PB.parsed.opdrachtgever || '') + '\n'
      + 'Eisen: ' + (PB.parsed.eisen || []).join(' | ') + '\n'
      + 'KANDIDAAT: ' + cand.naam + ' | ' + cand.senioriteit + '\n'
      + 'Profiel: ' + (res.cvData && res.cvData.kopprofiel || cand.profiel || '') + '\n'
      + 'Afgedekte eisen: ' + (match.eisen_afgedekt || []).join(' | ');
    const opmerking = await claude(sys, usr, 400);
    res.opmerking = opmerking;
    const el = document.getElementById('pb_opm_' + cid);
    if (el) el.value = opmerking;
    toast('Opmerking klaar.');
  } catch(e) { toast('Fout: ' + e.message); }
}

function pbDownloadCVWord(cid) {
  const res = PB.resultaten[cid];
  if (!res?.docxUri) { toast('Geen Word-bestand. Upload het bron-CV als .docx.'); return; }
  const a = document.createElement('a');
  a.href = res.docxUri;
  a.download = (res.cvFilename || 'CV').replace(/\.pdf$/, '') + '.docx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function pbDownloadCV(cid) {
  const res = PB.resultaten[cid];
  if (!res || !res.effectiefUrl) { toast('Geen CV beschikbaar.'); return; }
  window.open(res.effectiefUrl, '_blank');
}

function pbPreviewCV(cid) {
  const res = PB.resultaten[cid];
  if (!res || !res.effectiefUrl) { toast('Geen preview beschikbaar.'); return; }
  window.open(res.effectiefUrl, '_blank');
}

async function pbVulDocIn(cid) {
  if (!PB.docFile) { toast('Upload eerst een aanbiedingsdocument.'); return; }
  const cand = CANDIDATES.find(c => c.id === cid);
  const res = PB.resultaten[cid];
  if (!cand || !res) { toast('Genereer eerst het CV.'); return; }
  toast('Aanbiedingsdocument invullen...', true);
  try {
    const sys = 'Je vult een aanbiedingsdocument in voor een interim-kandidaat. Regels:'
      + '\n1. Vul ALLEEN in wat er in het kandidaatprofiel staat. Verzin NOOIT feiten.'
      + '\n2. Laat persoonlijke gegevens (BSN, adres, geboortedatum, foto) LEEG of markeer met [INVULLEN].'
      + '\n3. Licht elke eis en wens toe met concrete voorbeelden uit de ervaring van de kandidaat.'
      + '\n4. Houd exact dezelfde structuur en volgorde aan als het originele document.'
      + '\n5. Geen clichés: niet gebruiken: bewezen staat van dienst, gedegen kennis, proactief, resultaatgericht.'
      + '\n6. Gebruik geen emoji. Antwoord met ALLEEN de ingevulde documenttekst, geen uitleg, geen JSON.';
    const usr = 'ORIGINEEL DOCUMENT:\n' + PB.docFile + '\n\n'
      + 'AANVRAAG: ' + PB.parsed.functietitel + ' - ' + (PB.parsed.opdrachtgever || '') + '\n'
      + 'Eisen: ' + (PB.parsed.eisen || []).join(', ') + '\n'
      + 'Wensen: ' + (PB.parsed.wensen || []).join(', ') + '\n\n'
      + 'KANDIDAAT: ' + cand.naam + ' - ' + cand.senioriteit + ' - EUR ' + cand.tarief + '\n'
      + 'Profiel: ' + (res.cvData && res.cvData.kopprofiel || cand.profiel || '') + '\n'
      + 'Skills: ' + (cand.skills || []).join(', ') + '\n'
      + 'Ervaring: ' + JSON.stringify(cand.ervaring || []) + '\n'
      + 'Opleiding: ' + JSON.stringify(cand.opleiding || []);
    const filled = await claude(sys, usr, 3000);
    const origExt = PB.docFilename.split('.').pop().toLowerCase();
    const baseName = PB.docFilename.replace(/\.[^.]+$/, '') + '_' + cand.naam.replace(/\s+/g, '_') + '_ingevuld';
    let docBlob, fname;
    if (origExt === 'docx') {
      docBlob = await maakDocx(filled); fname = baseName + '.docx';
    } else if (origExt === 'xlsx' || origExt === 'xls') {
      docBlob = maakXlsx(filled, PB.docFile); fname = baseName + '.xlsx';
    } else {
      docBlob = new Blob([filled], { type: 'text/plain;charset=utf-8' }); fname = baseName + '.txt';
    }
    res.docFilled = true; res.docFilename = fname; res.docBlob = docBlob; res.docContent = filled;
    const opmEl = document.getElementById('pb_opm_' + cid);
    if (opmEl) res.opmerking = opmEl.value;
    toast('Document ingevuld.');
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}

function pbDownloadDoc(cid) {
  const res = PB.resultaten[cid];
  if (!res || !res.docBlob) {
    if (res && res.docContent) {
      const blob = new Blob([res.docContent], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = res.docFilename || 'Aanbieding_ingevuld.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return;
    }
    toast('Geen ingevuld document beschikbaar.'); return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.docBlob);
  a.download = res.docFilename || 'Aanbieding_ingevuld.docx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function wirePBDoc() {
  const drop = document.getElementById('pbDocDrop');
  const inp = document.getElementById('pbDocInput');
  if (!drop || !inp) return;
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handlePBDoc(e.dataTransfer.files[0]); };
  inp.onchange = e => { if (e.target.files[0]) handlePBDoc(e.target.files[0]); };
}

async function handlePBDoc(file) {
  toast('Document inlezen…', true);
  try {
    const txt = await extractFileText(file);
    PB.docFile = txt.slice(0, 12000);
    PB.docFilename = file.name;
    Object.values(PB.resultaten).forEach(r => { r.docFilled = false; r.docContent = ''; });
    toast('Document ingelezen: ' + file.name);
    renderPortalBuddy();
  } catch(e) { toast('Fout bij inlezen: ' + e.message); }
}

function pbClearDoc() {
  PB.docFile = null; PB.docFilename = '';
  Object.values(PB.resultaten).forEach(r => { r.docFilled = false; r.docContent = ''; });
  renderPortalBuddy();
}

async function pbNaarConcepten(cid) {
  const cand = CANDIDATES.find(c => c.id === cid);
  const res = PB.resultaten[cid];
  if (!cand || !res || !res.effectiefUrl) { toast('Genereer eerst het CV voor deze kandidaat.'); return; }
  const opmEl = document.getElementById('pb_opm_' + cid);
  if (opmEl) res.opmerking = opmEl.value;
  const reqTitle = PB.parsed ? (PB.parsed.functietitel || 'Portal aanvraag') : 'Portal aanvraag';
  const opdrachtgever = PB.parsed ? (PB.parsed.opdrachtgever || '') : '';
  try {
    const savedReqId = PB.reqId || null;
    let verifiedReqId = null;
    if (savedReqId) {
      const { data: chk } = await sb.from('aanvragen').select('id').eq('id', savedReqId).single();
      verifiedReqId = chk ? savedReqId : null;
    }
    await DB.saveConceptt({
      aanvraag_id: verifiedReqId,
      aanvraag_titel: '[Portal] ' + reqTitle,
      kandidaat_id: cand.id, kandidaat_naam: cand.naam,
      aan: opdrachtgever || '[Portal - vul ontvanger in]',
      onderwerp: 'Aanbieding ' + cand.naam + ' - ' + reqTitle,
      body: res.opmerking || '(Zie bijgevoegd CV)',
      cv_versie_id: null, cv_filename: res.cvFilename || 'CV.pdf', status: 'klaar'
    });
    CONCEPTEN = await DB.getConcepten();
    res.toegevoegdAanConcepten = true;
    toast('Toegevoegd aan concepten.');
    updateBadges();
    renderPortalBuddy();
  } catch(e) { toast('Fout: ' + e.message); }
}
