// ── Drawer utils ──────────────────────────────────────────────────────────────

function showDrawer() {
  document.getElementById('overlay').classList.add('show');
  document.getElementById('drawer').classList.add('show');
}

function closeDrawer() {
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('drawer').classList.remove('show');
  renderView();
}

// ── Aanvraag drawer ───────────────────────────────────────────────────────────

function openReqDrawer(id) {
  const r = AANVRAGEN.find(x => x.id === id);
  if (!r) return;
  document.getElementById('dTitle').textContent = r.functietitel || r.onderwerp || 'Aanvraag';
  document.getElementById('dSub').textContent = `${ROLE_LABELS[r.role_type] || 'Overig'} · ${r.van}`;
  renderReqBody(r);
  showDrawer();
}

function renderReqBody(r) {
  const body = document.getElementById('dBody');
  if (!r.is_relevant) {
    body.innerHTML = `<div class="panel"><h3>Niet-relevant</h3><p class="ai-note">${esc(r.samenvatting || '')}</p></div><div class="panel"><h3>Originele mail</h3><div class="raw-txt">${esc(r.body || '')}</div></div>`;
    return;
  }
  const ci = r.cv_instructies || {};
  const eisen = r.eisen || [], wensen = r.wensen || [], docs = r.gevraagde_documenten || [];
  const editMode = window._reqEditMode === r.id;
  let h = `<div class="panel">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
   <h3 style="margin:0">Gestructureerde aanvraag</h3>
   <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px">
     <span style="font-size:12px;color:var(--ink-soft)">Opgepakt door:</span>
     <select id="opgepakt_select" style="border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:12px;background:${r.opgepakt_door ? 'var(--moss)' : 'var(--white)'};color:${r.opgepakt_door ? '#fff' : 'inherit'}" onchange="pakOp('${r.id}',this.value)">
      <option value="">- niemand -</option>
      ${TEAMLEDEN.map(t => '<option value="' + esc(t.naam) + '"' + (r.opgepakt_door === t.naam ? ' selected' : '') + '>' + esc(t.naam) + '</option>').join('')}
     </select>
    </div>
    <button class="btn ghost sm" onclick="toggleReqEdit('${r.id}')">${editMode ? 'Annuleren' : 'Bewerken'}</button>
   </div>
  </div>`;

  if (editMode) {
    h += `<div class="two-col">
   <div class="field"><label>Functietitel</label><input id="re_titel" value="${esc(r.functietitel || '')}"></div>
   <div class="field"><label>Opdrachtgever</label><input id="re_opdrachtgever" value="${esc(r.opdrachtgever || '')}"></div>
   <div class="field"><label>Locatie</label><input id="re_locatie" value="${esc(r.locatie || '')}"></div>
   <div class="field"><label>Remote/hybride</label><input id="re_remote" value="${esc(r.remote || '')}"></div>
   <div class="field"><label>Startdatum</label><input id="re_start" value="${esc(r.startdatum || '')}"></div>
   <div class="field"><label>Duur</label><input id="re_duur" value="${esc(r.duur || '')}"></div>
   <div class="field"><label>Uren/week</label><input id="re_uren" value="${esc(r.uren_per_week || '')}"></div>
   <div class="field"><label>Max tarief</label><input id="re_tarief" value="${esc(r.tarief_max || '')}"></div>
   <div class="field"><label>Deadline</label><input type="date" id="re_deadline" value="${esc(r.deadline || '')}"></div>
  </div>
  <div class="field"><label>Eisen (komma-gescheiden)</label><input id="re_eisen" value="${esc(eisen.join(', '))}"></div>
  <div class="field"><label>Wensen (komma-gescheiden)</label><input id="re_wensen" value="${esc(wensen.join(', '))}"></div>
  <div class="field"><label>Gevraagde documenten (komma-gescheiden)</label><input id="re_docs" value="${esc(docs.join(', '))}"></div>
  <button class="btn" onclick="saveReqEdit('${r.id}')">Opslaan</button>`;
  } else {
    h += `<dl class="kv">
   <dt>Functietitel</dt><dd>${esc(r.functietitel || '-')}</dd>
   <dt>Opdrachtgever</dt><dd>${esc(r.opdrachtgever || '-')}</dd>
   <dt>Locatie</dt><dd>${esc(r.locatie || '-')}</dd>
   <dt>Remote</dt><dd>${esc(r.remote || '-')}</dd>
   <dt>Start</dt><dd>${esc(r.startdatum || '-')}</dd>
   <dt>Duur</dt><dd>${esc(r.duur || '-')}</dd>
   <dt>Uren/week</dt><dd>${esc(r.uren_per_week || '-')}</dd>
   <dt>Max tarief</dt><dd>${esc(r.tarief_max || '-')}</dd>
   <dt>Deadline</dt><dd>${esc(r.deadline || '-')}</dd>
  </dl>
  ${eisen.length ? `<div style="margin-top:10px"><b style="font-size:12px">Eisen</b><div class="chips">${eisen.map(e => `<span class="chip req">${esc(e)}</span>`).join('')}</div></div>` : ''}
  ${wensen.length ? `<div style="margin-top:8px"><b style="font-size:12px">Wensen</b><div class="chips">${wensen.map(e => `<span class="chip">${esc(e)}</span>`).join('')}</div></div>` : ''}
  ${docs.length ? `<div style="margin-top:8px"><b style="font-size:12px">Gevraagde documenten</b><div class="chips">${docs.map(e => `<span class="chip">${esc(e)}</span>`).join('')}</div></div>` : ''}
  <div style="margin-top:10px;font-size:12px;color:var(--ink-soft)">CV: foto <b>${esc(ci.foto || '?')}</b> · naam <b>${esc(ci.naamvorm || '?')}</b> · motivatie ${ci.motivatie_nodig ? 'gevraagd' : 'niet vereist'}${ci.anonimiseren ? ' · anonimiseren' : ''}</div>`;
  }
  h += `</div>`;

  if (r.portal_link) {
    h += `<div class="banner warn" style="margin-bottom:8px">
    Portal-link gevonden: <a href="${esc(r.portal_link)}" target="_blank" style="color:var(--moss-deep);font-weight:600;word-break:break-all">${esc(r.portal_link)}</a>
    <span style="display:block;font-size:11.5px;margin-top:4px;opacity:.8">Open de link, lees de aanvraag en plak de tekst in het Tekst-veld op Vandaag.</span>
  </div>`;
  }
  if (r.duplicate_of) {
    const o = AANVRAGEN.find(x => x.id === r.duplicate_of);
    h += `<div class="banner dup">Mogelijk duplicaat van <b>${esc(o?.functietitel || '')}</b> (via ${esc((o?.van || '').split('@').pop())}). Beoordeel of dit dezelfde opdracht is.</div>`;
  }

  const matches = r.matches ? JSON.parse(r.matches) : [];
  h += `<div class="panel">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
   <h3 style="margin:0">Matching & go / no-go</h3>
   ${matches.length ? `<button class="btn ghost sm" onclick="doMatch('${r.id}',true)">Opnieuw matchen (${CANDIDATES.length} kandidaten)</button>` : ''}
  </div>
  <div id="matchArea">`;
  if (!matches.length) {
    h += `<button class="btn" id="matchBtn" onclick="doMatch('${r.id}')">Matchen met Claude (${CANDIDATES.length} kandidaten)</button>
    <p style="font-size:12px;color:var(--slate);margin-top:8px">Claude vergelijkt de aanvraag met alle kandidaten en geeft scores met onderbouwing.</p>`;
  } else {
    h += renderMatches(r, matches);
  }
  h += `</div></div>`;
  h += `<div class="panel"><h3>Originele mail</h3><div class="raw-txt">${esc(r.body || '')}</div></div>`;
  body.innerHTML = h;
}

function renderMatches(r, matches) {
  if (!matches.length) return `<p style="font-size:12.5px;color:var(--slate)">Geen kandidaten met score ≥ 25.</p>`;
  return matches.map((m, i) => {
    const c = CANDIDATES.find(x => x.id === m.candidate_id) || m.candidate;
    if (!c) return '';
    const cls = m.score >= 70 ? '' : m.score >= 45 ? 'mid' : 'low';
    const d = m.decision;
    const hasBron = !!(c.cv_bron?.tekst || c.profiel);
    return `<div class="match" id="match_${r.id}_${i}">
   <div class="match-top">
    <div class="score-ring ${cls}" style="--p:${m.score}"><span>${m.score}</span></div>
    <div style="flex:1"><div style="font-weight:700;font-size:14px">${esc(c.naam)}</div>
     <div style="font-size:12px;color:var(--ink-soft)">${(c.rollen || []).join(' · ')} · €${c.tarief} · beschikbaar ${c.beschikbaar}</div></div>
   </div>
   <div class="reasoning">
    <div class="col pro"><h4>Passend</h4><ul>${(m.pro || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="col risk"><h4>Risico</h4><ul>${(m.risico || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="col covered"><h4>Eisen afgedekt</h4><ul>${(m.eisen_afgedekt || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="col missing"><h4>Ontbreekt</h4><ul>${(m.ontbreekt || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
   </div>
   ${!hasBron ? `<p class="nocv">⚠ Geen bron-CV of profiel aanwezig - voeg dit toe op de Team-pagina voor betere resultaten.</p>` : ''}
   <div class="go-nogo">
    <button class="dec ${d === 'voorstellen' ? 'yes' : ''}" onclick="decide('${r.id}',${i},'voorstellen')">✓ Voorstellen</button>
    <button class="dec ${d === 'niet' ? 'no' : ''}" onclick="decide('${r.id}',${i},'niet')">✕ Niet</button>
    <button class="dec ${d === 'later' ? 'wait' : ''}" onclick="decide('${r.id}',${i},'later')">◷ Later</button>
   </div>
   <div id="draft_${r.id}_${i}">${m.draftHtml || ''}</div>
  </div>`;
  }).join('');
}

async function doMatch(reqId, force) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  if (!force) {
    const btn = document.getElementById('matchBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Matchen...'; }
  } else {
    toast('Opnieuw matchen met ' + CANDIDATES.length + ' kandidaten...', true);
  }
  try {
    const matches = await runMatching(r);
    if (force && r.matches) {
      const oude = JSON.parse(r.matches);
      matches.forEach(m => {
        const oud = oude.find(o => o.candidate_id === m.candidate_id);
        if (oud?.decision) m.decision = oud.decision;
        if (oud?.draftHtml) m.draftHtml = oud.draftHtml;
        if (oud?.draft) m.draft = oud.draft;
        if (oud?.docxUri) m.docxUri = oud.docxUri;
        if (oud?.cv_versie_id) m.cv_versie_id = oud.cv_versie_id;
      });
    }
    r.matches = JSON.stringify(matches);
    r.status = 'kandidaten_gevonden';
    await DB.upsertAanvraag(r);
    AANVRAGEN = await DB.getAanvragen();
    renderReqBody(AANVRAGEN.find(x => x.id === reqId));
    toast('Matching voltooid - ' + matches.length + ' kandidaten gerankt.');
  } catch(e) {
    toast('Fout: ' + e.message);
    const btn = document.getElementById('matchBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Opnieuw proberen'; }
  }
}

function toggleReqEdit(reqId) {
  window._reqEditMode = window._reqEditMode === reqId ? null : reqId;
  const r = AANVRAGEN.find(x => x.id === reqId);
  if (r) renderReqBody(r);
}

async function saveReqEdit(reqId) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  if (!r) return;
  const comma = id => document.getElementById(id)?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
  r.functietitel    = document.getElementById('re_titel')?.value || r.functietitel;
  r.opdrachtgever   = document.getElementById('re_opdrachtgever')?.value || null;
  r.locatie         = document.getElementById('re_locatie')?.value || null;
  r.remote          = document.getElementById('re_remote')?.value || null;
  r.startdatum      = document.getElementById('re_start')?.value || null;
  r.duur            = document.getElementById('re_duur')?.value || null;
  r.uren_per_week   = document.getElementById('re_uren')?.value || null;
  r.tarief_max      = document.getElementById('re_tarief')?.value || null;
  r.deadline        = document.getElementById('re_deadline')?.value || null;
  r.eisen           = comma('re_eisen');
  r.wensen          = comma('re_wensen');
  r.gevraagde_documenten = comma('re_docs');
  try {
    await DB.upsertAanvraag(r);
    AANVRAGEN = await DB.getAanvragen();
    window._reqEditMode = null;
    toast('Aanvraag opgeslagen.');
    const updated = AANVRAGEN.find(x => x.id === reqId);
    if (updated) renderReqBody(updated);
  } catch(e) { toast('Fout: ' + e.message); }
}

async function pakOp(reqId, naam) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  if (!r) return;
  r.opgepakt_door = naam || null;
  try {
    await DB.upsertAanvraag(r);
    AANVRAGEN = await DB.getAanvragen();
    const sel = document.getElementById('opgepakt_select');
    if (sel) { sel.style.background = naam ? 'var(--moss)' : 'var(--white)'; sel.style.color = naam ? '#fff' : 'inherit'; }
    toast(naam ? naam + ' pakt dit op.' : 'Toewijzing verwijderd.');
  } catch(e) { toast('Fout: ' + e.message); }
}

async function decide(reqId, i, choice) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  const matches = JSON.parse(r.matches || '[]');
  const m = matches[i];
  m.decision = choice;
  const el = document.getElementById(`match_${reqId}_${i}`);
  if (el) el.querySelectorAll('.dec').forEach((b, bi) => {
    b.classList.remove('yes', 'no', 'wait');
    if (bi === 0 && choice === 'voorstellen') b.classList.add('yes');
    else if (bi === 1 && choice === 'niet') b.classList.add('no');
    else if (bi === 2 && choice === 'later') b.classList.add('wait');
  });
  if (choice === 'voorstellen' && !m.draftHtml) {
    const dd = document.getElementById(`draft_${reqId}_${i}`);
    if (dd) dd.innerHTML = `<div style="padding:12px 0;font-size:12.5px;color:var(--ink-soft)"><span class="spin d"></span> CV herschrijven en mail genereren…</div>`;
    try {
      const cand = CANDIDATES.find(c => c.id === m.candidate_id);
      toast('CV herschrijven…', true);
      const cvData = await rewriteCV(r, cand);
      const versieNr = await DB.getNextCVVersie(cand.id);
      const baseName = 'CV_' + cand.naam.replace(/ /g, '_') + '_v' + versieNr;
      toast('Beste CV-versie selecteren...', true);
      const cvVersie = await getBesteCVVersie(cand, r);
      if (!cvVersie) throw new Error('Geen CV beschikbaar voor ' + cand.naam + '. Upload een rol-CV of bron-CV op de Team-pagina.');
      toast('CV herschrijven (' + cvVersie.roltype + ')…', true);
      const docxBlob = await herschrijfDocx(cvVersie.blob, cvData, cand);
      const arrBuf = await docxBlob.arrayBuffer();
      const docxUri = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + arrayBufferToBase64(arrBuf);
      toast('Uploaden…', true);
      let docxUrl = null;
      try { docxUrl = await DB.uploadDocx(cand.id, versieNr, docxBlob); } catch(uploadErr) { console.warn('Upload mislukt:', uploadErr.message); }
      const cvVersieRecord = await DB.saveCVVersie({ kandidaat_id: cand.id, versie: versieNr, gemaakt_voor: r.functietitel, aanvraag_id: r.id, cv_data: cvData, pdf_url: docxUrl || '' });
      m.cv_versie_id = cvVersieRecord?.id;
      m.docxUrl = docxUrl;
      m.docxUri = docxUri;
      m.cvFilename = baseName + '.docx';
      toast('Mail schrijven…', true);
      const mailResult = await generateMail(r, cand, m, cvData);
      m.draft = { onderwerp: mailResult.onderwerp, body: mailResult.body, to: r.van };
      m.draftHtml = buildDraftHtml(r, m, i, cvData);
      r.matches = JSON.stringify(matches);
      r.status = 'concept_klaar';
      await DB.upsertAanvraag(r);
      AANVRAGEN = await DB.getAanvragen();
      const dd2 = document.getElementById(`draft_${reqId}_${i}`);
      if (dd2) dd2.innerHTML = m.draftHtml;
      toast('CV en conceptmail klaar.');
    } catch(e) {
      toast('Fout: ' + e.message); m.decision = null;
      const dd3 = document.getElementById(`draft_${reqId}_${i}`);
      if (dd3) dd3.innerHTML = `<p style="color:var(--rust);font-size:12px;margin-top:8px">Fout: ${esc(e.message)}</p>`;
    }
  }
  r.matches = JSON.stringify(matches);
  await DB.upsertAanvraag(r);
}

function buildDraftHtml(r, m, i, cvData) {
  const dr = m.draft;
  const sigs = cvData?.signalen || [];
  return `<div class="draft-section">
  <h4>Conceptmail + aangepast CV (versie ${m.cv_versie_id || '-'})</h4>
  ${sigs.length ? `<div class="banner warn">⬡ Te checken: ${sigs.map(esc).join(' · ')}</div>` : ''}
  <div class="df"><label>Aan</label><input id="df_to_${i}" value="${esc(dr.to || r.van)}" onchange="updateDraftField('${r.id}',${i},'to',this.value)"></div>
  <div class="df"><label>Onderwerp</label><input id="df_sub_${i}" value="${esc(dr.onderwerp)}" onchange="updateDraftField('${r.id}',${i},'onderwerp',this.value)"></div>
  <div class="df"><label>Bericht</label><textarea id="df_body_${i}" onchange="updateDraftField('${r.id}',${i},'body',this.value)">${esc(dr.body)}</textarea></div>
  <div style="margin-bottom:12px">
   <div style="font-size:11.5px;font-weight:600;margin-bottom:6px;color:var(--ink-soft)">BIJLAGE - aangepast CV</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn sm" onclick="downloadCVWord('${r.id}',${i})">Word downloaden</button>
   </div>
  </div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
   <button class="btn" onclick="createConcept('${r.id}',${i})">Concept klaarzetten</button>
   <span style="font-size:11.5px;color:var(--slate)">Niets gaat automatisch de deur uit.</span>
  </div>
 </div>`;
}

function updateDraftField(reqId, i, field, val) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  if (!r || !r.matches) return;
  const matches = JSON.parse(r.matches);
  if (matches[i]?.draft) matches[i].draft[field] = val;
  r.matches = JSON.stringify(matches);
}

function downloadCVWord(reqId, i) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  const m = JSON.parse(r.matches || '[]')[i];
  if (!m?.docxUri) { toast('Geen Word-bestand beschikbaar. Upload het bron-CV als .docx op de Team-pagina.'); return; }
  const a = document.createElement('a');
  a.href = m.docxUri;
  a.download = (m.cvFilename || 'CV.docx');
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function createConcept(reqId, i) {
  const r = AANVRAGEN.find(x => x.id === reqId);
  const matches = JSON.parse(r.matches || '[]');
  const m = matches[i];
  const cand = CANDIDATES.find(c => c.id === m.candidate_id);
  if (!m.draft) { toast('Geen concept beschikbaar.'); return; }
  try {
    await DB.saveConceptt({
      aanvraag_id: r.id, aanvraag_titel: r.functietitel || r.onderwerp,
      kandidaat_id: m.candidate_id, kandidaat_naam: cand?.naam || '',
      aan: m.draft.to || r.van, onderwerp: m.draft.onderwerp, body: m.draft.body,
      cv_versie_id: m.cv_versie_id || null, cv_filename: m.cvFilename || 'CV.pdf',
      status: 'klaar'
    });
    CONCEPTEN = await DB.getConcepten();
    toast('Concept klaargezet.'); updateBadges();
    r.status = 'concept_klaar';
    await DB.upsertAanvraag(r);
    AANVRAGEN = await DB.getAanvragen();
  } catch(e) { toast('Fout bij opslaan: ' + e.message); }
}

async function downloadConceptCV(conceptId) {
  const c = CONCEPTEN.find(x => x.id === conceptId);
  if (!c) { toast('Concept niet gevonden.'); return; }
  for (const req of AANVRAGEN) {
    if (req.id !== c.aanvraag_id) continue;
    const matches = JSON.parse(req.matches || '[]');
    for (const m of matches) {
      if (m.candidate_id === c.kandidaat_id && m.docxUri) {
        const a = document.createElement('a');
        a.href = m.docxUri; a.download = c.cv_filename || 'CV.docx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); return;
      }
    }
  }
  if (c.cv_versie_id) {
    try {
      const { data } = await sb.from('cv_versies').select('pdf_url').eq('id', c.cv_versie_id).single();
      if (data?.pdf_url && data.pdf_url.length > 10) {
        const path = data.pdf_url.includes('/cv-bestanden/') ? data.pdf_url.split('/cv-bestanden/').pop().split('?')[0] : null;
        if (path) {
          const { data: signed } = await sb.storage.from('cv-bestanden').createSignedUrl(path, 300);
          if (signed?.signedUrl) { window.open(signed.signedUrl, '_blank'); return; }
        }
        window.open(data.pdf_url, '_blank'); return;
      }
    } catch(e) { console.warn('Storage ophalen mislukt:', e.message); }
  }
  toast('CV-bestand niet meer beschikbaar. Open de aanvraag en genereer het CV opnieuw via Voorstellen.');
}

async function downloadEML(conceptId) {
  const c = CONCEPTEN.find(x => x.id === conceptId);
  if (!c) { toast('Concept niet gevonden.'); return; }
  toast('EML voorbereiden…', true);
  try {
    let pdfB64 = '', pdfNaam = c.cv_filename || 'CV.pdf';
    const isDocx = pdfNaam.toLowerCase().endsWith('.docx');
    if (c.cv_versie_id) {
      const { data } = await sb.from('cv_versies').select('pdf_url').eq('id', c.cv_versie_id).single();
      if (data?.pdf_url) {
        try {
          const parts = data.pdf_url.split('/cv-bestanden/').pop().split('?')[0];
          const { data: signed } = await sb.storage.from('cv-bestanden').createSignedUrl(parts, 120);
          const url = signed?.signedUrl || data.pdf_url;
          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();
          pdfB64 = arrayBufferToBase64(buf);
        } catch(e) { pdfB64 = ''; }
      }
    }
    const boundary = '----=_Part_' + Date.now();
    const now = new Date().toUTCString();
    const fromAddr = SETTINGS.afzender_email || 'werkbank@interim.nl';
    const fromNaam = SETTINGS.afzender_naam || 'Interim Werkbank';
    const plainBody = c.body.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let eml = `From: ${fromNaam} <${fromAddr}>\nTo: ${c.aan}\nSubject: ${c.onderwerp}\nDate: ${now}\nMIME-Version: 1.0\nContent-Type: multipart/mixed; boundary="${boundary}"\n\n--${boundary}\nContent-Type: text/plain; charset="utf-8"\nContent-Transfer-Encoding: quoted-printable\n\n${plainBody}\n`;
    if (pdfB64) {
      eml += `\n--${boundary}\nContent-Type: ${isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'}; name="${pdfNaam}"\nContent-Transfer-Encoding: base64\nContent-Disposition: attachment; filename="${pdfNaam}"\n\n${pdfB64}\n`;
    }
    eml += `--${boundary}--`;
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${c.kandidaat_naam.replace(/\s+/g, '_')}_${c.aanvraag_titel.replace(/\W+/g, '_').slice(0, 30)}.eml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('EML gedownload — dubbelklik om te openen in Outlook.');
  } catch(e) { toast('Fout bij EML: ' + e.message); }
}

// ── Delete functions ───────────────────────────────────────────────────────────

async function verwijderAanvraag(id) {
  if (!confirm('Aanvraag verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
  try {
    await DB.deleteAanvraag(id);
    AANVRAGEN = await DB.getAanvragen();
    toast('Aanvraag verwijderd.');
    renderView();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function verwijderKandidaat(id, naam) {
  if (!confirm(`Kandidaat "${naam}" en alle bijbehorende CV-versies verwijderen?`)) return;
  try {
    await DB.deleteKandidaat(id);
    CANDIDATES = await DB.getKandidaten();
    CANDIDATES.forEach(herstelRawBlob);
    toast('Kandidaat verwijderd.'); renderView();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function verwijderConcept(id) {
  if (!confirm('Concept verwijderen?')) return;
  try {
    await DB.deleteConcept(id);
    CONCEPTEN = await DB.getConcepten();
    toast('Concept verwijderd.'); renderView();
  } catch(e) { toast('Fout: ' + e.message); }
}

// ── Kandidaat drawer ───────────────────────────────────────────────────────────

function quickViewCV(candId) {
  const cand = CANDIDATES.find(c => c.id === candId);
  if (!cand?.cv_bron?.tekst) { toast('Geen CV-tekst beschikbaar.'); return; }
  const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>CV - ${cand.naam}</title>
  <style>body{font-family:-apple-system,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;line-height:1.6;color:#16201c;background:#f3efe6}
  h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;color:#4a6b4d;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 8px;border-bottom:1px solid #cfc7b4;padding-bottom:4px}
  pre{white-space:pre-wrap;font-family:inherit;font-size:13.5px;background:#fff;padding:16px;border-radius:8px;border:1px solid #cfc7b4}
  .meta{color:#5d6b78;font-size:13px;margin-bottom:16px}</style></head><body>
  <h1>${cand.naam}</h1>
  <div class="meta">${cand.senioriteit} · ${(cand.rollen || []).join(', ')} · ${cand.locatie || ''}</div>
  <h2>Bron-CV tekst (${cand.cv_bron.naam})</h2>
  <pre>${cand.cv_bron.tekst.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function openCandidateDrawer(id) {
  const c = id ? CANDIDATES.find(x => x.id === id) : {
    id: null, naam: '', email: '', beschikbaar: '', tarief: '',
    rollen: [], skills: [], sectoren: [], locatie: '', reisbereidheid: 60,
    profiel: '', ervaring: [], opleiding: [], motivatie: [], opmerkingen: '', cv_bron: null
  };
  document.getElementById('dTitle').textContent = id ? 'Kandidaat bewerken' : 'Nieuwe kandidaat';
  document.getElementById('dSub').textContent = id ? esc(c.naam) : 'Nieuw profiel toevoegen';
  document.getElementById('dBody').innerHTML = buildCandidateForm(c);
  showDrawer();
  wireCVUpload(c);
  wireRolCVUpload(c.id);
  window._editCand = c;
  if (c.id) setTimeout(() => laadRolCVLijst(c.id), 300);
}

function buildCandidateForm(c) {
  const isNieuw = !c.id;
  return `
  <div class="panel"><h3>CV-versies per rol</h3>
    <p style="font-size:12px;color:var(--ink-soft);margin-top:0">Upload per rol een aparte .docx. De app kiest automatisch de juiste versie bij een aanvraag.
      ${isNieuw ? '<br><b>Sla de kandidaat eerst op, daarna kun je CVs uploaden.</b>' : ''}
    </p>
    ${!isNieuw ? `
    <div id="rolcv_items" style="margin-bottom:12px"><div style="font-size:12px;color:var(--slate)">Laden...</div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select id="rolcv_select" style="border:1px solid var(--line);border-radius:7px;padding:7px 10px;font-size:13px;background:var(--white)">
        ${ROL_KOLOMMEN.map(r => '<option>' + r + '</option>').join('')}
        <option>Overig</option>
      </select>
      <input type="file" id="rolcv_input" accept=".docx" style="display:none">
      <button class="btn ghost sm" onclick="document.getElementById('rolcv_input').click()">+ CV uploaden</button>
      <span id="rolcv_upload_status" style="font-size:12px;color:var(--moss)"></span>
    </div>` : ''}
  </div>
  <div class="panel"><h3>Basisgegevens</h3>
    <div class="two-col">
      <div class="field"><label>Naam *</label><input id="k_naam" value="${esc(c.naam)}"></div>
      <div class="field"><label>E-mail</label><input id="k_email" value="${esc(c.email || '')}"></div>
      <div class="field"><label>Beschikbaar vanaf</label><input type="date" id="k_besch" value="${esc(c.beschikbaar || '')}"></div>
      <div class="field"><label>Tarief EUR/uur *</label><input id="k_tarief" value="${esc(c.tarief || '')}"></div>
      <div class="field"><label>Locatie</label><input id="k_loc" value="${esc(c.locatie || '')}"></div>
      <div class="field"><label>Reisbereidheid (km)</label><input id="k_reis" value="${esc(c.reisbereidheid || 60)}"></div>
    </div>
  </div>
  <div class="panel"><h3>Profiel & vaardigheden</h3>
    <div class="field"><label>Rollen (komma-gescheiden)</label><input id="k_rollen" value="${esc((c.rollen || []).join(', '))}"></div>
    <div class="field"><label>Skills (komma-gescheiden)</label><input id="k_skills" value="${esc((c.skills || []).join(', '))}"></div>
    <div class="field"><label>Sectorervaring (komma-gescheiden)</label><input id="k_sect" value="${esc((c.sectoren || []).join(', '))}"></div>
    <div class="field"><label>Profielschets</label><textarea id="k_profiel" rows="3">${esc(c.profiel || '')}</textarea></div>
    <div class="field"><label>Opmerkingen</label><textarea id="k_opm" rows="2">${esc(c.opmerkingen || '')}</textarea></div>
  </div>
  <div class="panel"><h3>Bron-CV (tekst referentie)</h3>
    <p style="font-size:12px;color:var(--ink-soft);margin-top:0">Optioneel: upload het volledige CV als tekst-referentie voor de matching en AI-analyse.</p>
    <div class="upload-zone" id="cvDrop" style="padding:14px">${c.cv_bron?.naam ? `${esc(c.cv_bron.naam)} - klik om te vervangen` : 'Sleep .docx of klik'}</div>
    <input type="file" id="cvInp" accept=".docx" style="display:none">
    <div id="cvBronInfo">${c.cv_bron?.tekst ? `<div class="filechip">${esc(c.cv_bron.naam)} <span style="font-size:11px;color:var(--slate);margin-left:6px">${c.cv_bron.tekst.length} tekens</span><span class="x" onclick="clearBronCV()">x</span></div>` : ''}</div>
  </div>
  <div style="display:flex;gap:8px">
    <button class="btn" onclick="saveCandidate()">Opslaan</button>
    ${isNieuw ? '' : `<button class="btn danger" onclick="deleteCandidate('${c.id}')">Verwijderen</button>`}
  </div>`;
}

async function laadRolCVLijst(candId) {
  if (!candId) return;
  const el = document.getElementById('rolcv_items');
  if (!el) return;
  try {
    const versies = await DB.getCVVersiesVanKandidaat(candId);
    const rolVersies = versies.filter(v => v.roltype);
    if (!rolVersies.length) {
      el.innerHTML = '<div style="font-size:12px;color:var(--slate);padding:8px 0">Nog geen rol-CVs geupload. Selecteer een rol en klik + CV uploaden.</div>';
      return;
    }
    const perRol = {};
    rolVersies.forEach(v => { perRol[v.roltype] = v; });
    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">'
      + Object.entries(perRol).map(([rol, v]) =>
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--paper-2);border-radius:7px;border:1px solid var(--line)">'
        + '<span style="font-family:var(--mono);font-size:10px;background:var(--white);padding:3px 8px;border-radius:5px;border:1px solid var(--line);white-space:nowrap">' + esc(rol) + '</span>'
        + '<span style="font-size:12.5px;font-weight:600;flex:1">' + esc(v.versie_naam || 'CV.docx') + '</span>'
        + '<button class="btn ghost sm" onclick="downloadRolCV(&quot;' + candId + '&quot;,&quot;' + esc(rol) + '&quot;)">Download</button>'
        + '<button class="btn ghost sm" style="color:var(--rust);border-color:var(--rust)" onclick="verwijderRolCV(' + v.id + ')">Verwijderen</button>'
        + '</div>'
      ).join('') + '</div>';
  } catch(e) { if (el) el.innerHTML = '<div style="font-size:12px;color:var(--rust)">' + esc(e.message) + '</div>'; }
}

async function verwijderRolCV(versieId) {
  if (!confirm('CV-versie verwijderen?')) return;
  const { error } = await sb.from('cv_versies').delete().eq('id', versieId);
  if (error) { toast('Fout: ' + error.message); return; }
  const c = window._editCand;
  if (c) laadRolCVLijst(c.id);
  toast('CV-versie verwijderd.');
}

function wireRolCVUpload(candId) {
  const inp = document.getElementById('rolcv_input');
  if (!inp) return;
  inp.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) { toast('Alleen .docx bestanden.'); return; }
    const rol = document.getElementById('rolcv_select')?.value;
    if (!rol) { toast('Selecteer eerst een rol.'); return; }
    const statusEl = document.getElementById('rolcv_upload_status');
    if (statusEl) statusEl.textContent = 'Uploaden...';
    try {
      const { url } = await DB.uploadRolCV(candId, rol, file.name, file);
      const versieNr = await DB.getNextCVVersie(candId);
      await DB.saveCVVersie({ kandidaat_id: candId, versie: versieNr, gemaakt_voor: rol, roltype: rol, versie_naam: file.name, aanvraag_id: null, cv_data: {}, pdf_url: url });
      if (statusEl) statusEl.textContent = rol + ' CV opgeslagen.';
      laadRolCVLijst(candId);
      inp.value = '';
    } catch(err) { if (statusEl) statusEl.textContent = 'Fout: ' + err.message; toast('Fout: ' + err.message); }
  };
}

function wireCVUpload(c) {
  const drop = document.getElementById('cvDrop'), inp = document.getElementById('cvInp');
  if (!drop) return;
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handleBronCV(e.dataTransfer.files[0]); };
  inp.onchange = e => { if (e.target.files[0]) handleBronCV(e.target.files[0]); };
}

async function handleBronCV(file) {
  if (!file.name.toLowerCase().endsWith('.docx')) { toast('Alleen .docx bestanden zijn toegestaan als bron-CV.'); return; }
  toast('CV inlezen...', true);
  try {
    const txt = await extractFileText(file);
    window._editCand.cv_bron = { naam: file.name, tekst: txt.slice(0, 9000), rawBlob: file, opgeslagen: false };
    document.getElementById('cvBronInfo').innerHTML = '<div class="filechip">' + esc(file.name) + ' <span style="font-size:11px;color:var(--slate);margin-left:6px">' + txt.length + ' tekens</span><span class="x" onclick="clearBronCV()">x</span></div>';
    document.getElementById('cvDrop').innerHTML = 'Bron-CV: <b>' + esc(file.name) + '</b> (.docx) - klik om te vervangen';
    toast('CV ingelezen - wordt opgeslagen bij Kandidaat opslaan.');
  } catch(e) { toast('Fout: ' + e.message); }
}

function clearBronCV() {
  window._editCand.cv_bron = null;
  document.getElementById('cvBronInfo').innerHTML = '';
  document.getElementById('cvDrop').innerHTML = 'Sleep het CV hier naartoe (.docx) of klik';
}

async function saveCandidate() {
  const c = window._editCand;
  if (!c.id) c.id = genUUID();
  c.naam        = (document.getElementById('k_naam')?.value || '').trim();
  c.email       = document.getElementById('k_email')?.value || '';
  c.beschikbaar = document.getElementById('k_besch')?.value.trim() || null;
  const tarifEl = document.getElementById('k_tarief');
  if (!tarifEl || !tarifEl.value.trim()) { toast('Tarief is verplicht.'); return; }
  c.tarief      = +tarifEl.value;
  c.locatie     = document.getElementById('k_loc')?.value.trim() || null;
  const reisEl  = document.getElementById('k_reis');
  c.reisbereidheid = reisEl && reisEl.value.trim() ? +reisEl.value : null;
  c.rollen      = listFromComma('k_rollen');
  c.skills      = listFromComma('k_skills');
  c.sectoren    = listFromComma('k_sect');
  c.profiel     = document.getElementById('k_profiel')?.value || c.profiel || '';
  c.opmerkingen = document.getElementById('k_opm')?.value || (c.opmerkingen || '');
  if (!c.ervaring) c.ervaring = [];
  if (!c.opleiding) c.opleiding = [];
  try {
    // Upload bron-CV als nieuw bestand
    if (c.cv_bron?.rawBlob && !c.cv_bron.opgeslagen) {
      await DB.uploadBronCV(c.id, c.cv_bron.rawBlob);
      c.cv_bron.opgeslagen = true;
    }
    const opslaan = { ...c, cv_bron: c.cv_bron ? { naam: c.cv_bron.naam, tekst: c.cv_bron.tekst, opgeslagen: c.cv_bron.opgeslagen } : null };
    await DB.upsertKandidaat(opslaan);
    CANDIDATES = await DB.getKandidaten();
    CANDIDATES.forEach(herstelRawBlob);

    // Sync kalender
    if (c.beschikbaar) {
      const bestaande = KALENDER.filter(e => e.kandidaat_id === c.id);
      for (const e of bestaande) await DB.deleteKalender(e.id);
      const d = new Date(c.beschikbaar);
      if (!isNaN(d)) {
        const m = d.getMonth() + 1, j = d.getFullYear();
        const rol = kalBepaalRol(c);
        await DB.upsertKalender({ kandidaat_id: c.id, kandidaat_naam: c.naam, maand: m, jaar: j, rol, status: 'beschikbaar', bijgewerkt_op: new Date().toISOString() });
      }
      KALENDER = await DB.getKalender();
    }
    toast('Kandidaat opgeslagen.'); closeDrawer(); setView('professionals');
  } catch(e) { toast('Fout bij opslaan: ' + e.message); }
}

async function deleteCandidate(id) {
  if (!confirm('Kandidaat en alle bijbehorende CV-versies verwijderen?')) return;
  await DB.deleteKandidaat(id);
  CANDIDATES = await DB.getKandidaten();
  CANDIDATES.forEach(herstelRawBlob);
  toast('Verwijderd.'); closeDrawer(); setView('professionals');
}

// ── Rol drawer ────────────────────────────────────────────────────────────────

async function openRolDrawer(rolId) {
  const rol = rolId ? ROLLEN.find(r => r.id === rolId) : null;
  const kanalen = rolId ? KANALEN.filter(k => k.rol_id === rolId) : [];
  document.getElementById('dTitle').textContent = rol ? (rol.functietitel || 'Rol') : 'Nieuwe rol';
  document.getElementById('dSub').textContent = rol ? (rol.klant || '') : 'Vul de rolgegevens in';
  document.getElementById('dBody').innerHTML = buildRolDrawerHtml(rol, kanalen);
  showDrawer();
  window._editRol = rol ? { ...rol } : { id: null, functietitel: '', klant: '', locatie: '', uren_per_week: '', deadline: '', omschrijving: '', status: 'open' };
}

async function openRolDrawerMetData(data) {
  const nieuweRol = {
    id: genUUID(),
    functietitel: data.functietitel || '',
    klant: data.klant || '',
    locatie: data.locatie || '',
    uren_per_week: data.uren_per_week || '',
    deadline: data.deadline || '',
    omschrijving: data.omschrijving || '',
    status: 'open',
    aangemaakt_op: new Date().toISOString()
  };
  try {
    await DB.upsertRol(nieuweRol);
    ROLLEN = await DB.getRollen();
    updateBadges();
    await openRolDrawer(nieuweRol.id);
    toast('Rol aangemaakt. Voeg kanalen toe.');
  } catch(e) { toast('Fout: ' + e.message); }
}

function buildRolDrawerHtml(rol, kanalen) {
  const r = rol || {};
  let h = '<div class="panel"><h3>Rol</h3><div class="two-col">';
  h += '<div class="field"><label>Functietitel *</label><input id="rd_titel" value="' + esc(r.functietitel || '') + '"></div>';
  h += '<div class="field"><label>Klant / Opdrachtgever</label><input id="rd_klant" value="' + esc(r.klant || '') + '"></div>';
  h += '<div class="field"><label>Locatie</label><input id="rd_locatie" value="' + esc(r.locatie || '') + '"></div>';
  h += '<div class="field"><label>Uren/week</label><input id="rd_uren" value="' + esc(r.uren_per_week || '') + '"></div>';
  h += '<div class="field"><label>Globale deadline</label><input type="date" id="rd_deadline" value="' + esc(r.deadline || '') + '"></div>';
  h += '<div class="field"><label>Status</label><select id="rd_status"><option value="open" ' + (r.status === 'open' ? 'selected' : '') + '>Open</option><option value="afgerond" ' + (r.status === 'afgerond' ? 'selected' : '') + '>Afgerond</option></select></div>';
  h += '</div><div class="field"><label>Omschrijving / eisen</label><textarea id="rd_omschrijving" rows="4">' + esc(r.omschrijving || '') + '</textarea></div>';
  h += '<button class="btn sm" onclick="saveRol()">Rol opslaan</button></div>';

  if (rol) {
    h += '<div class="panel"><h3>Kanalen (' + kanalen.length + ')</h3>';
    if (kanalen.length) kanalen.forEach(k => { h += buildKanaalBlok(k); });
    else h += '<div style="font-size:12.5px;color:var(--slate);margin-bottom:12px">Nog geen kanalen. Voeg toe wie deze rol uitzet.</div>';

    h += '<div style="background:var(--paper-2);border-radius:9px;padding:14px;margin-top:8px">';
    h += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin-bottom:10px">+ Nieuw kanaal</div>';
    h += '<div class="two-col">';
    h += '<div class="field"><label>Broker / Partij</label><input id="nk_broker" placeholder="Hero, Striive, Randstad..."></div>';
    h += '<div class="field"><label>Type</label><select id="nk_type"><option value="mail">Mail</option><option value="portal">Portal</option><option value="telefoon">Telefoon / Appje</option></select></div>';
    h += '<div class="field"><label>Portal URL (optioneel)</label><input id="nk_url" placeholder="https://..."></div>';
    h += '<div class="field"><label>Deadline *</label><input type="date" id="nk_deadline"></div>';
    h += '<div class="field"><label>Opgepakt door</label><select id="nk_opgepakt"><option value="">- niemand -</option>' + TEAMLEDEN.map(t => '<option>' + esc(t.naam) + '</option>').join('') + '</select></div>';
    h += '<div class="field"><label>Kandidaat</label><select id="nk_kandidaat"><option value="">- nog niet gekozen -</option>' + CANDIDATES.map(c => '<option value="' + c.id + '">' + esc(c.naam) + '</option>').join('') + '</select></div>';
    h += '</div><button class="btn sm" onclick="voegKanaalToe(this.dataset.id)" data-id=' + rol.id + '>Kanaal toevoegen</button>';
    h += '</div></div>';

    // ── Matching ──────────────────────────────────────────────────────────────
    const rolMatches = (window._rolMatches || {})[rol.id] || [];
    h += '<div class="panel"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h += '<h3 style="margin:0">Match professionals</h3>';
    if (rolMatches.length) h += '<button class="btn ghost sm" onclick="matchProfessionalsVoorRol(\'' + rol.id + '\',true)">Opnieuw matchen</button>';
    h += '</div>';
    if (!rolMatches.length) {
      h += '<button class="btn" onclick="matchProfessionalsVoorRol(\'' + rol.id + '\')">Matchen met Claude (' + CANDIDATES.length + ' professionals)</button>';
      h += '<p style="font-size:12px;color:var(--slate);margin-top:8px">Claude vergelijkt de rolbeschrijving met alle professionals en geeft scores met onderbouwing.</p>';
    } else {
      h += renderRolMatches(rol, kanalen, rolMatches);
    }
    h += '</div>';

    h += '<div class="panel"><h3>Gerelateerde rollen</h3>';
    h += '<button class="btn ghost sm" onclick="window._checkDup(this.dataset.id)" data-id=' + rol.id + '>Controleer op vergelijkbare rollen</button>';
    h += '<div id="dup_rollen_result" style="margin-top:10px"></div></div>';
  }
  return h;
}

function buildKanaalBlok(k) {
  const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
  const typeLabel = { mail: 'Mail', portal: 'Portal', telefoon: 'Telefoon / Appje' }[k.type] || k.type;
  let h = '<div style="border:1px solid var(--line);border-radius:9px;padding:12px 14px;margin-bottom:10px;background:var(--white)">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
  h += '<span style="font-weight:700;font-size:13px">' + esc(k.broker_naam) + '</span>';
  h += '<span style="font-size:11px;font-family:var(--mono);background:var(--paper-2);padding:2px 7px;border-radius:4px">' + typeLabel + '</span>';
  h += kanaalStatusPill(k.status);
  h += '<button class="btn danger sm" style="margin-left:auto" onclick="window._verwijderKanaal(this.dataset.id)" data-id=' + k.id + '>x</button>';
  h += '</div>';
  if (k.portal_url) h += '<div style="margin-bottom:8px"><a href="' + esc(k.portal_url) + '" target="_blank" style="font-size:12px;color:var(--moss)">' + esc(k.portal_url.slice(0, 50)) + '...</a></div>';
  h += '<div class="two-col" style="margin-bottom:10px">';
  h += '<div class="field"><label>Kandidaat</label><select id="kk_cand_' + k.id + '" onchange="updateKanaal(' + k.id + ',&quot;kandidaat_id&quot;,this.value)"><option value="">- geen -</option>' + CANDIDATES.map(c => '<option value="' + c.id + '"' + (k.kandidaat_id === c.id ? ' selected' : '') + '>' + esc(c.naam) + '</option>').join('') + '</select></div>';
  h += '<div class="field"><label>Opgepakt door</label><select id="kk_opg_' + k.id + '" onchange="updateKanaal(' + k.id + ',&quot;opgepakt_door&quot;,this.value)"><option value="">- niemand -</option>' + TEAMLEDEN.map(t => '<option' + (k.opgepakt_door === t.naam ? ' selected' : '') + '>' + esc(t.naam) + '</option>').join('') + '</select></div>';
  h += '<div class="field"><label>Status</label><select id="kk_stat_' + k.id + '" onchange="updateKanaal(' + k.id + ',&quot;status&quot;,this.value)">' + ['nieuw', 'in_behandeling', 'verstuurd', 'afgewezen', 'gewonnen'].map(s => '<option' + (k.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>';
  h += '<div class="field"><label>Deadline</label><input type="date" id="kk_dl_' + k.id + '" value="' + esc(k.deadline || '') + '" onchange="updateKanaal(' + k.id + ',&quot;deadline&quot;,this.value)"></div>';
  h += '</div>';
  if (k.kandidaat_id) {
    const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
    const heeftCV = !!(cand?.cv_bron?.tekst || cand?.cv_bron?.opgeslagen);
    h += '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">';
    h += '<button class="btn ghost sm" onclick="window._genereerKanaalCV(this.dataset.id)" data-id=' + k.id + '>CV + Mail klaarzetten</button>';
    if (!heeftCV) h += '<span style="font-size:11.5px;color:var(--rust)">⚠ Geen bron-CV — upload via Team & CV</span>';
    if (k.notitie) h += '<span style="font-size:11.5px;color:var(--slate);align-self:center">' + esc(k.notitie) + '</span>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function wireRolDrawer(rolId, kanalen) {}

async function saveRol() {
  const r = window._editRol;
  if (!r) return;
  r.functietitel  = document.getElementById('rd_titel')?.value.trim() || r.functietitel;
  r.klant         = document.getElementById('rd_klant')?.value.trim() || null;
  r.locatie       = document.getElementById('rd_locatie')?.value.trim() || null;
  r.uren_per_week = document.getElementById('rd_uren')?.value.trim() || null;
  r.deadline      = document.getElementById('rd_deadline')?.value.trim() || null;
  r.omschrijving  = document.getElementById('rd_omschrijving')?.value || null;
  r.status        = document.getElementById('rd_status')?.value || 'open';
  if (!r.functietitel) { toast('Functietitel is verplicht.'); return; }
  if (!r.id) r.id = genUUID();
  try {
    const saved = await DB.upsertRol(r);
    ROLLEN = await DB.getRollen();
    window._editRol = saved;
    updateBadges();
    toast('Rol opgeslagen.');
    await openRolDrawer(saved.id);
  } catch(e) { toast('Fout: ' + e.message); }
}

async function voegKanaalToe(rolId) {
  const broker = document.getElementById('nk_broker')?.value.trim();
  if (!broker) { toast('Vul een broker/partij naam in.'); return; }
  const deadline = document.getElementById('nk_deadline')?.value;
  if (!deadline) { toast('Deadline is verplicht.'); return; }
  const k = {
    rol_id: rolId,
    broker_naam: broker,
    type: document.getElementById('nk_type')?.value || 'mail',
    portal_url: document.getElementById('nk_url')?.value.trim() || null,
    deadline: document.getElementById('nk_deadline')?.value.trim() || null,
    opgepakt_door: document.getElementById('nk_opgepakt')?.value || null,
    kandidaat_id: document.getElementById('nk_kandidaat')?.value || null,
    status: 'nieuw',
    aangemaakt_op: new Date().toISOString(),
    bijgewerkt_op: new Date().toISOString()
  };
  try {
    await DB.insertKanaal(k);
    KANALEN = await DB.getKanalen();
    updateBadges();
    toast('Kanaal toegevoegd.');
    await openRolDrawer(rolId);
  } catch(e) { toast('Fout: ' + e.message); }
}

async function updateKanaal(kanaalId, veld, waarde) {
  const k = KANALEN.find(x => x.id === kanaalId);
  if (!k) return;
  k[veld] = (waarde === '' || waarde === null || waarde === undefined) ? null : waarde;
  k.bijgewerkt_op = new Date().toISOString();
  try {
    await DB.upsertKanaal(k);
    KANALEN = await DB.getKanalen();
    updateBadges();
    if (document.getElementById('drawer').classList.contains('show')) {
      await openRolDrawer(k.rol_id);
    }
  } catch(e) { toast('Fout: ' + e.message); }
}

async function verwijderKanaal(id) {
  if (!confirm('Kanaal verwijderen?')) return;
  const k = KANALEN.find(x => x.id == id);
  const rolId = k?.rol_id;
  await DB.deleteKanaal(id);
  KANALEN = await DB.getKanalen();
  if (rolId) await openRolDrawer(rolId);
  toast('Kanaal verwijderd.');
}

async function verwijderRol(id) {
  if (!confirm('Rol en alle bijbehorende kanalen verwijderen?')) return;
  await DB.deleteRol(id);
  ROLLEN = await DB.getRollen();
  KANALEN = await DB.getKanalen();
  updateBadges(); renderRollenView();
  toast('Rol verwijderd.');
}

async function matchProfessionalsVoorRol(rolId, force) {
  const rol = ROLLEN.find(r => r.id === rolId);
  if (!rol) return;
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }
  if (!CANDIDATES.length) { toast('Geen professionals beschikbaar om te matchen.'); return; }

  toast('Matchen met ' + CANDIDATES.length + ' professionals…', true);
  try {
    const matches = await runMatchingVoorRol(rol);
    window._rolMatches = window._rolMatches || {};
    window._rolMatches[rolId] = matches;
    toast('Matching klaar — ' + matches.length + ' professionals gerankt.');
    await openRolDrawer(rolId);
  } catch(e) { toast('Fout bij matchen: ' + e.message); }
}

function renderRolMatches(rol, kanalen, matches) {
  if (!matches.length) return '<p style="font-size:12.5px;color:var(--slate)">Geen professionals met score ≥ 25.</p>';

  return matches.map((m, i) => {
    const c = m.candidate;
    if (!c) return '';
    const cls = m.score >= 70 ? '' : m.score >= 45 ? 'mid' : 'low';

    // Bepaal of deze professional al aan een kanaal is toegewezen voor deze rol
    const toegewezenKanaal = kanalen.find(k => k.kandidaat_id === c.id);

    // Kanalen zonder kandidaat (voor toewijzing)
    const vrijeKanalen = kanalen.filter(k => !k.kandidaat_id);

    let toewijzingHtml = '';
    if (toegewezenKanaal) {
      toewijzingHtml = `<span style="font-size:11.5px;color:var(--moss);font-family:var(--mono)">✓ Toegewezen aan ${esc(toegewezenKanaal.broker_naam)}</span>`;
    } else if (kanalen.length === 0) {
      toewijzingHtml = `<span style="font-size:11.5px;color:var(--slate)">Voeg eerst een kanaal toe om toe te wijzen</span>`;
    } else if (vrijeKanalen.length === 1) {
      toewijzingHtml = `<button class="btn sm" onclick="wijsToeAanKanaal('${vrijeKanalen[0].id}','${c.id}','${rol.id}')">Toewijzen aan ${esc(vrijeKanalen[0].broker_naam)}</button>`;
    } else if (vrijeKanalen.length > 1) {
      toewijzingHtml = `<select id="keuze_kanaal_${i}" style="border:1px solid var(--line);border-radius:6px;padding:5px 8px;font-size:12px">
        <option value="">— kies kanaal —</option>
        ${vrijeKanalen.map(k => `<option value="${k.id}">${esc(k.broker_naam)}</option>`).join('')}
      </select>
      <button class="btn sm" onclick="wijsToeVanSelect('keuze_kanaal_${i}','${c.id}','${rol.id}')">Toewijzen</button>`;
    } else {
      toewijzingHtml = `<span style="font-size:11.5px;color:var(--slate)">Alle kanalen al toegewezen</span>`;
    }

    return `<div class="match" style="margin-bottom:14px">
      <div class="match-top">
        <div class="score-ring ${cls}" style="--p:${m.score}"><span>${m.score}</span></div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${esc(c.naam)}</div>
          <div style="font-size:12px;color:var(--ink-soft)">${(c.rollen||[]).join(' · ')}${c.tarief ? ' · €'+c.tarief+'/u' : ''}${c.beschikbaar ? ' · beschikbaar '+c.beschikbaar : ''}</div>
        </div>
      </div>
      <div class="reasoning">
        <div class="col pro"><h4>Passend</h4><ul>${(m.pro||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="col risk"><h4>Risico</h4><ul>${(m.risico||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="col covered"><h4>Afgedekt</h4><ul>${(m.eisen_afgedekt||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="col missing"><h4>Ontbreekt</h4><ul>${(m.ontbreekt||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
        ${toewijzingHtml}
      </div>
    </div>`;
  }).join('');
}

async function wijsToeAanKanaal(kanaalId, candId, rolId) {
  await updateKanaal(kanaalId, 'kandidaat_id', candId);
  toast('Professional toegewezen.');
  await openRolDrawer(rolId);
}

async function wijsToeVanSelect(selectId, candId, rolId) {
  const kanaalId = document.getElementById(selectId)?.value;
  if (!kanaalId) { toast('Selecteer een kanaal.'); return; }
  await wijsToeAanKanaal(kanaalId, candId, rolId);
}

async function checkDuplicaatRollen(rolId) {
  const rol = ROLLEN.find(r => r.id === rolId);
  if (!rol || !claudeKey()) return;
  const el = document.getElementById('dup_rollen_result');
  if (el) el.innerHTML = '<span style="font-size:12px;color:var(--slate)">Controleren...</span>';
  const andereRollen = ROLLEN.filter(r => r.id !== rolId && r.status === 'open');
  if (!andereRollen.length) { if (el) el.innerHTML = '<span style="font-size:12px;color:var(--slate)">Geen andere open rollen om te vergelijken.</span>'; return; }
  try {
    const sys = 'Je vergelijkt interim-rollen om te bepalen of het dezelfde opdracht is. Antwoord ALLEEN geldige JSON.';
    const usr = 'ROL: ' + rol.functietitel + ' bij ' + (rol.klant || '?') + '\n\nANDERE ROLLEN:\n'
      + andereRollen.map((r, i) => '[' + i + '] ' + r.functietitel + ' bij ' + (r.klant || '?')).join('\n')
      + '\n\nGeef JSON: {"vergelijkbaar":[{"index":0,"reden":"waarom vergelijkbaar of niet","zelfde":true}]}';
    const res = pj(await claude(sys, usr, 800));
    const zelfde = (res.vergelijkbaar || []).filter(v => v.zelfde);
    if (!zelfde.length) { if (el) el.innerHTML = '<div style="font-size:12px;color:var(--moss)">Geen vergelijkbare open rollen gevonden.</div>'; return; }
    let html = '<div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--gold)">Mogelijk dezelfde rol:</div>';
    zelfde.forEach(v => {
      const andere = andereRollen[v.index];
      if (!andere) return;
      html += '<div style="background:var(--paper-2);border-radius:7px;padding:10px 12px;margin-bottom:8px;font-size:12.5px">';
      html += '<b>' + esc(andere.functietitel) + '</b> bij ' + esc(andere.klant || '?') + '<br>';
      html += '<span style="color:var(--slate)">' + esc(v.reden) + '</span><br>';
      html += '<div style="display:flex;gap:7px;margin-top:8px">';
      html += '<button class="btn ghost sm" onclick="samenvoegRollen(&quot;' + rolId + '&quot;,&quot;' + andere.id + '&quot;)">Samenvoegen als kanalen</button>';
      html += '<button class="btn ghost sm" onclick="document.getElementById(&quot;dup_rollen_result&quot;).innerHTML=&quot;&quot;">Negeren</button>';
      html += '</div></div>';
    });
    if (el) el.innerHTML = html;
  } catch(e) { if (el) el.innerHTML = '<span style="font-size:12px;color:var(--rust)">Fout: ' + esc(e.message) + '</span>'; }
}

async function samenvoegRollen(rolId1, rolId2) {
  if (!confirm('De kanalen van de tweede rol worden verplaatst naar de eerste. De tweede rol wordt verwijderd. Doorgaan?')) return;
  try {
    const k2 = KANALEN.filter(k => k.rol_id === rolId2);
    for (const k of k2) { k.rol_id = rolId1; k.bijgewerkt_op = new Date().toISOString(); await DB.upsertKanaal(k); }
    await sb.from('rollen').delete().eq('id', rolId2);
    ROLLEN = await DB.getRollen();
    KANALEN = await DB.getKanalen();
    toast('Rollen samengevoegd.');
    await openRolDrawer(rolId1);
  } catch(e) { toast('Fout: ' + e.message); }
}

async function genereerKanaalCV(kanaalId) {
  const k = KANALEN.find(x => x.id == kanaalId);
  const rol = k ? ROLLEN.find(r => r.id === k.rol_id) : null;
  const cand = k ? CANDIDATES.find(c => c.id === k.kandidaat_id) : null;
  if (!k || !rol || !cand) { toast('Selecteer eerst een kandidaat voor dit kanaal.'); return; }
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }

  // Laad CV blob
  const req = { functietitel: rol.functietitel, opdrachtgever: rol.klant, locatie: rol.locatie, eisen: [], wensen: [], role_type: 'overig', cv_instructies: {} };
  toast('CV ophalen...', true);
  const cvVersie = await getBesteCVVersie(cand, req);
  if (!cvVersie) { toast('Geen CV beschikbaar voor ' + cand.naam + '. Upload een bron-CV op de Team pagina.'); return; }

  // Toon laadstatus in drawer
  const body = document.getElementById('dBody');
  body.innerHTML = `<div class="panel" style="text-align:center;padding:32px 16px">
    <div class="spin" style="margin:0 auto 16px"></div>
    <div style="font-size:13px;color:var(--ink-soft)">CV analyseren voor <b>${esc(rol.functietitel)}</b>…</div>
    <div style="font-size:12px;color:var(--slate);margin-top:6px">Claude bekijkt alleen wat écht aangepast moet worden</div>
  </div>`;

  try {
    // Blob uit storage heeft geen .name — extraheer tekst direct via mammoth
    const cvBuf = await cvVersie.blob.arrayBuffer();
    const cvTekst = (await mammoth.extractRawText({ arrayBuffer: cvBuf })).value;
    const rolBeschrijving = [
      'Functietitel: ' + rol.functietitel,
      rol.klant ? 'Klant: ' + rol.klant : '',
      rol.locatie ? 'Locatie: ' + rol.locatie : '',
      rol.omschrijving ? 'Omschrijving: ' + rol.omschrijving : ''
    ].filter(Boolean).join('\n');

    const suggesties = await analyseerCVVoorRol(cand, rolBeschrijving, cvTekst);

    // Detecteer CV-format eisen in de omschrijving
    const cvEisen = rol.omschrijving ? await detecteerCVEisen(rol.omschrijving) : null;

    // Sla reviewstatus op
    window._cvReview = { kanaalId: k.id, rolId: k.rol_id, cvVersie, cand, rol, suggesties, toevoegingen: [] };

    if (cvEisen && cvEisen.length) {
      toonCVEisenModal(cvEisen, cand, rol);
    } else {
      renderCVReviewUI();
    }
  } catch(e) {
    toast('Fout bij analyseren: ' + e.message);
    await openRolDrawer(k.rol_id);
  }
}

function toonCVEisenModal(eisen, cand, rol) {
  const bestaand = document.getElementById('cvEisenModal');
  if (bestaand) bestaand.remove();

  const modal = document.createElement('div');
  modal.id = 'cvEisenModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px';

  const eisenHtml = eisen.map(e =>
    `<li style="margin-bottom:8px;font-size:13.5px"><b>${esc(e.type.charAt(0).toUpperCase()+e.type.slice(1))}:</b> ${esc(e.beschrijving)}</li>`
  ).join('');

  modal.innerHTML = `
    <div style="background:var(--paper);border-radius:14px;padding:32px 36px;max-width:480px;width:100%;box-shadow:0 12px 48px rgba(0,0,0,.35)">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--moss);margin-bottom:10px">CV-format eisen gevonden</div>
      <h3 style="margin:0 0 14px;font-size:17px">Deze aanvraag vraagt om extra toevoegingen</h3>
      <ul style="margin:0 0 22px;padding-left:18px;color:var(--ink)">${eisenHtml}</ul>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:22px">Wil je dat ik deze toevoegingen schrijf en meeneem in de CV-review?</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="cvEisenJa" style="flex:1">Ja, toevoegingen genereren</button>
        <button class="btn ghost" id="cvEisenNee" style="flex:1">Nee, alleen CV aanpassen</button>
      </div>
      <div id="cvEisenLaad" style="display:none;text-align:center;padding:16px 0;font-size:13px;color:var(--ink-soft)">
        <span class="spin" style="margin-right:8px"></span>Toevoegingen schrijven…
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('cvEisenJa').onclick = async () => {
    document.getElementById('cvEisenJa').style.display = 'none';
    document.getElementById('cvEisenNee').style.display = 'none';
    document.getElementById('cvEisenLaad').style.display = 'block';
    try {
      const toevoegingen = await genereerCVToevoegingen(cand, rol, eisen);
      window._cvReview.toevoegingen = toevoegingen;
    } catch(e) {
      toast('Fout bij genereren toevoegingen: ' + e.message);
    }
    modal.remove();
    renderCVReviewUI();
  };

  document.getElementById('cvEisenNee').onclick = () => {
    window._cvReview.toevoegingen = [];
    modal.remove();
    renderCVReviewUI();
  };
}

function renderCVReviewUI() {
  const { kanaalId, rolId, cand, rol, suggesties } = window._cvReview;
  const body = document.getElementById('dBody');

  const s = suggesties || {};
  const bullets      = Array.isArray(s.bullets) ? s.bullets : [];
  const ervTitels    = Array.isArray(s.werkervaringstitel) ? s.werkervaringstitel : [];
  const beschrTitels = Array.isArray(s.beschrijving_titels) ? s.beschrijving_titels : [];
  // Ondersteun zowel nieuw formaat {oud,nieuw} als oud formaat string
  const titelObj   = s.functietitel  && typeof s.functietitel  === 'object' ? s.functietitel  : (s.functietitel  ? { oud: cand.rollen?.[0] || '', nieuw: s.functietitel  } : null);
  const profielObj = s.profielschets && typeof s.profielschets === 'object' ? s.profielschets : (s.profielschets ? { oud: '',                        nieuw: s.profielschets } : null);

  let h = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
    <button class="btn ghost sm" onclick="openRolDrawer('${rolId}')">← Terug</button>
    <div>
      <div style="font-weight:700;font-size:14px">CV aanpassen</div>
      <div style="font-size:12px;color:var(--ink-soft)">${esc(cand.naam)} → ${esc(rol.functietitel)}${rol.klant ? ' bij ' + esc(rol.klant) : ''}</div>
    </div>
  </div>`;

  // Functietitel
  if (titelObj) {
    h += `<div class="panel" style="padding:14px 16px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <input type="checkbox" id="rw_titel_aan" checked style="margin-top:3px;flex-shrink:0">
        <div style="flex:1">
          <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:6px">Functietitel</div>
          ${titelObj.oud ? `<div style="font-size:12px;color:var(--slate);margin-bottom:6px;text-decoration:line-through">${esc(titelObj.oud)}</div>` : ''}
          <input id="rw_titel_val" value="${esc(titelObj.nieuw)}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;background:var(--white)">
          <div id="rw_titel_oud" style="display:none">${esc(titelObj.oud)}</div>
        </div>
      </div>
    </div>`;
  } else {
    h += `<div class="panel" style="padding:12px 16px;opacity:.5">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)">Functietitel — geen aanpassing nodig</div>
    </div>`;
  }

  // Profielschets
  if (profielObj) {
    h += `<div class="panel" style="padding:14px 16px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <input type="checkbox" id="rw_profiel_aan" checked style="margin-top:3px;flex-shrink:0">
        <div style="flex:1">
          <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:6px">Profielschets</div>
          ${profielObj.oud ? `<div style="font-size:12px;color:var(--slate);margin-bottom:6px;font-style:italic">${esc(profielObj.oud.slice(0, 120))}${profielObj.oud.length > 120 ? '…' : ''}</div>` : ''}
          <textarea id="rw_profiel_val" rows="4" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;background:var(--white);resize:vertical">${esc(profielObj.nieuw)}</textarea>
          <div id="rw_profiel_oud" style="display:none">${esc(profielObj.oud)}</div>
        </div>
      </div>
    </div>`;
  } else {
    h += `<div class="panel" style="padding:12px 16px;opacity:.5">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)">Profielschets — geen aanpassing nodig</div>
    </div>`;
  }

  // Werkervaring functietitels
  if (ervTitels.length) {
    h += `<div class="panel" style="padding:14px 16px">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:12px">Functietitels werkervaring</div>`;
    ervTitels.forEach((e, i) => {
      h += `<div style="border:1px solid var(--line);border-radius:8px;padding:11px 13px;margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <input type="checkbox" id="rw_erv_${i}" checked style="margin-top:3px;flex-shrink:0">
          <div style="flex:1">
            <div style="font-size:11.5px;color:var(--slate);margin-bottom:5px;text-decoration:line-through">${esc(e.oud)}</div>
            <input id="rw_erv_val_${i}" value="${esc(e.nieuw)}" style="width:100%;box-sizing:border-box;padding:6px 9px;border:1px solid var(--moss);border-radius:6px;font-size:12.5px;background:var(--white)">
          </div>
        </div>
      </div>`;
    });
    h += `</div>`;
  } else {
    h += `<div class="panel" style="padding:12px 16px;opacity:.5">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)">Functietitels werkervaring — geen aanpassingen nodig</div>
    </div>`;
  }

  // Functietitels in beschrijvingstekst
  if (beschrTitels.length) {
    h += `<div class="panel" style="padding:14px 16px">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:12px">Functietitel vermeldingen in beschrijving</div>`;
    beschrTitels.forEach((e, i) => {
      h += `<div style="border:1px solid var(--line);border-radius:8px;padding:11px 13px;margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <input type="checkbox" id="rw_beschr_${i}" checked style="margin-top:3px;flex-shrink:0">
          <div style="flex:1">
            <div style="font-size:11.5px;color:var(--slate);margin-bottom:5px;font-style:italic">${esc(e.oud)}</div>
            <input id="rw_beschr_val_${i}" value="${esc(e.nieuw)}" style="width:100%;box-sizing:border-box;padding:6px 9px;border:1px solid var(--moss);border-radius:6px;font-size:12.5px;background:var(--white)">
          </div>
        </div>
      </div>`;
    });
    h += `</div>`;
  }

  // Bullets
  if (bullets.length) {
    h += `<div class="panel" style="padding:14px 16px">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:12px">Taken / verantwoordelijkheden</div>`;
    bullets.forEach((b, i) => {
      h += `<div style="border:1px solid var(--line);border-radius:8px;padding:11px 13px;margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <input type="checkbox" id="rw_bullet_${i}" checked style="margin-top:3px;flex-shrink:0">
          <div style="flex:1">
            <div style="font-size:11.5px;color:var(--slate);margin-bottom:5px;font-style:italic">${esc(b.oud)}</div>
            <div style="font-size:10px;color:var(--ink-soft);margin-bottom:4px">→</div>
            <textarea id="rw_bullet_val_${i}" rows="2" style="width:100%;box-sizing:border-box;padding:6px 9px;border:1px solid var(--moss);border-radius:6px;font-size:12.5px;background:var(--white);resize:vertical">${esc(b.nieuw)}</textarea>
          </div>
        </div>
      </div>`;
    });
    h += `</div>`;
  } else {
    h += `<div class="panel" style="padding:12px 16px;opacity:.5">
      <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)">Taken — geen aanpassingen nodig</div>
    </div>`;
  }

  // Toevoegingen (motivatie, voorblad, etc.)
  const toevoegingen = window._cvReview.toevoegingen || [];
  if (toevoegingen.length) {
    toevoegingen.forEach((t, i) => {
      h += `<div class="panel" style="padding:14px 16px;border-left:3px solid var(--moss)">
        <div style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--moss);margin-bottom:6px">Toevoeging — ${esc(t.titel)}</div>
        <textarea id="rv_toev_${i}" rows="8" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;background:var(--white);resize:vertical;line-height:1.6">${esc(t.inhoud)}</textarea>
      </div>`;
    });
  }

  h += `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
    <button class="btn" onclick="downloadMetWijzigingen(false)">CV + Mail</button>
    <button class="btn ghost" onclick="downloadMetWijzigingen(true)">Alleen CV</button>
    <span style="font-size:11.5px;color:var(--slate)">CV + Mail → .eml downloaden · Alleen CV → .docx downloaden</span>
  </div>`;

  body.innerHTML = h;
  document.getElementById('dTitle').textContent = 'CV review';
  document.getElementById('dSub').textContent = cand.naam + ' · ' + rol.functietitel;
}

async function downloadMetWijzigingen(alleenCV = false) {
  const { cvVersie, cand, rol, suggesties } = window._cvReview;
  const s = suggesties || {};
  const bullets      = Array.isArray(s.bullets) ? s.bullets : [];
  const ervTitels    = Array.isArray(s.werkervaringstitel) ? s.werkervaringstitel : [];
  const beschrTitels = Array.isArray(s.beschrijving_titels) ? s.beschrijving_titels : [];

  const vervangingen = [];

  // Functietitel — gebruik de exacte oude tekst die Claude uit het CV haalde
  if (document.getElementById('rw_titel_aan')?.checked) {
    const oudeT = document.getElementById('rw_titel_oud')?.textContent?.trim() || '';
    const nieuweT = document.getElementById('rw_titel_val')?.value?.trim() || '';
    if (oudeT && nieuweT && oudeT !== nieuweT) vervangingen.push({ oud: oudeT, nieuw: nieuweT });
  }

  // Profielschets — gebruik de exacte eerste zin die Claude uit het CV haalde
  if (document.getElementById('rw_profiel_aan')?.checked) {
    const oudeP = document.getElementById('rw_profiel_oud')?.textContent?.trim() || '';
    const nieuweP = document.getElementById('rw_profiel_val')?.value?.trim() || '';
    if (oudeP && nieuweP && oudeP !== nieuweP) vervangingen.push({ oud: oudeP, nieuw: nieuweP });
  }

  // Werkervaring header titels
  ervTitels.forEach((e, i) => {
    if (document.getElementById(`rw_erv_${i}`)?.checked) {
      const nieuweE = document.getElementById(`rw_erv_val_${i}`)?.value?.trim() || e.nieuw;
      if (e.oud && nieuweE && e.oud !== nieuweE) vervangingen.push({ oud: e.oud, nieuw: nieuweE });
    }
  });

  // Functietitels in beschrijvingstekst
  beschrTitels.forEach((e, i) => {
    if (document.getElementById(`rw_beschr_${i}`)?.checked) {
      const nieuweE = document.getElementById(`rw_beschr_val_${i}`)?.value?.trim() || e.nieuw;
      if (e.oud && nieuweE && e.oud !== nieuweE) vervangingen.push({ oud: e.oud, nieuw: nieuweE });
    }
  });

  // Bullets
  bullets.forEach((b, i) => {
    if (document.getElementById(`rw_bullet_${i}`)?.checked) {
      const nieuweB = document.getElementById(`rw_bullet_val_${i}`)?.value || b.nieuw;
      vervangingen.push({ oud: b.oud, nieuw: nieuweB });
    }
  });

  const cvNaam = `CV ${cand.naam} - ${rol.functietitel} (JGP).docx`;

  // Lees bewerkte toevoegingen uit de UI
  const toevoegingen = (window._cvReview.toevoegingen || []).map((t, i) => ({
    ...t,
    inhoud: document.getElementById(`rv_toev_${i}`)?.value || t.inhoud
  }));

  toast('CV aanpassen...', true);
  let cvBlob;
  let waarschuwing = '';
  try {
    if (!vervangingen.length) {
      cvBlob = cvVersie.blob instanceof ArrayBuffer ? new Blob([cvVersie.blob]) : cvVersie.blob;
    } else {
      const { blob, resultaten } = await vervangTekstInDocx(cvVersie.blob, vervangingen);
      cvBlob = blob;
      const nietGevonden = resultaten.filter(r => r.status === 'niet_gevonden');
      if (nietGevonden.length) waarschuwing = ` Let op: ${nietGevonden.length} aanpassing(en) niet gevonden — controleer handmatig.`;
    }
    // Voeg toevoegingen in als die er zijn
    if (toevoegingen.length) {
      toast('Toevoegingen invoegen...', true);
      cvBlob = await voegToevoegingToeAanDocx(cvBlob, toevoegingen);
    }
  } catch(e) { toast('Fout bij CV aanpassen: ' + e.message); return; }

  // ── Alleen CV: direct .docx downloaden ───────────────────────────────────
  if (alleenCV) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(cvBlob);
    a.download = cvNaam;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('CV gedownload.' + waarschuwing);
    return;
  }

  // ── CV + Mail: genereer mail en maak .eml ────────────────────────────────
  toast('Mail genereren...', true);
  let mailData;
  try {
    mailData = await genereerKanaalMailTekst(rol, cand);
  } catch(e) { toast('Fout bij mail genereren: ' + e.message); return; }

  toast('EML samenstellen...', true);
  try {
    const s = SETTINGS;
    const from = `${s.afzender_naam||'PortalBuddy'} <${s.afzender_email||''}>`;
    const boundary = '----=_Part_' + Date.now();
    const cvB64 = arrayBufferToBase64(await cvBlob.arrayBuffer());

    const eml = [
      `From: ${from}`,
      `To: `,
      `Subject: ${mailData.onderwerp||'Kandidaatpresentatie'}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="utf-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      mailData.body || '',
      ``,
      `--${boundary}`,
      `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${cvNaam}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${cvNaam}"`,
      ``,
      cvB64,
      `--${boundary}--`
    ].join('\r\n');

    const emlBlob = new Blob([eml], { type: 'message/rfc822' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(emlBlob);
    a.download = `${cand.naam} - ${rol.functietitel} (JGP).eml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);

    toast('Mail + CV klaar — dubbelklik het .eml bestand om te openen in Outlook.' + waarschuwing);
  } catch(e) { toast('Fout bij EML aanmaken: ' + e.message); }
}

async function genereerKanaalMail(kanaalId) {
  const k = KANALEN.find(x => x.id == kanaalId);
  const rol = k ? ROLLEN.find(r => r.id === k.rol_id) : null;
  const cand = k ? CANDIDATES.find(c => c.id === k.kandidaat_id) : null;
  if (!k || !rol || !cand) { toast('Selecteer eerst een kandidaat voor dit kanaal.'); return; }
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }
  toast('Mail opstellen...', true);
  try {
    const sys = 'Je schrijft een zakelijke Nederlandse e-mail voor het voorstellen van een interim-kandidaat. Kort, concreet, geen clichés. ALLEEN geldige JSON.';
    const usr = 'ROL: ' + rol.functietitel + ' bij ' + (rol.klant || 'opdrachtgever') + '\nKANDIDAAT: ' + cand.naam + ' | ' + cand.senioriteit + ' | EUR ' + cand.tarief + '\nPROFIEL: ' + (cand.profiel || '') + '\n\nJSON: {"onderwerp":str,"body":str}';
    const res = pj(await claude(sys, usr, 800));
    k.notitie = res.onderwerp + '\n\n' + res.body;
    await DB.upsertKanaal({ ...k, bijgewerkt_op: new Date().toISOString() });
    KANALEN = await DB.getKanalen();
    toast('Mail opgesteld - zie notitie bij kanaal.');
    await openRolDrawer(k.rol_id);
  } catch(e) { toast('Fout: ' + e.message); }
}

// Inline bron-CV upload from inside aanvraag drawer (no candidate drawer needed)
async function inlineUploadBronCV(event, candId) {
  const file = event.target.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.docx')) { toast('Alleen .docx bestanden.'); return; }
  toast('CV uploaden...', true);
  try {
    const txt = await extractFileText(file);
    const cand = CANDIDATES.find(c => c.id === candId);
    if (!cand) { toast('Kandidaat niet gevonden.'); return; }
    await DB.uploadBronCV(cand.id, file);
    cand.cv_bron = { naam: file.name, tekst: txt.slice(0, 9000), opgeslagen: true, rawBlob: file };
    const opslaan = { ...cand, cv_bron: { naam: file.name, tekst: txt.slice(0, 9000), opgeslagen: true } };
    await DB.upsertKandidaat(opslaan);
    CANDIDATES = await DB.getKandidaten();
    const updated = CANDIDATES.find(c => c.id === candId);
    if (updated) updated.cv_bron.rawBlob = file;
    toast('Bron-CV opgeslagen voor ' + cand.naam + '.');
  } catch(e) { toast('Fout: ' + e.message); }
}

function openBatchUpload() {
  openBatchUploadDrawer();
}
