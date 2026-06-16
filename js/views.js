// ── View router ───────────────────────────────────────────────────────────────

const VIEW_TITLES = {
  vandaag: 'Vandaag',
  rollen: 'Rollen',
  team: 'Team & CV',
  instellingen: 'Instellingen'
};

function setView(v) {
  activeView = v;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  document.getElementById('vTitle').textContent = VIEW_TITLES[v] || v;
  renderTopActions(v);
  renderView();
}

function renderTopActions(v) {
  const el = document.getElementById('topActions');
  if (v === 'vandaag')      el.innerHTML = '<button class="btn ghost sm" onclick="openInvoerDrawer()">+ Aanvraag toevoegen</button>';
  else if (v === 'rollen')  el.innerHTML = '<button class="btn ghost sm" onclick="openRolDrawer(null)">+ Nieuwe rol</button>';
  else if (v === 'team')    el.innerHTML = '<button class="btn ghost sm" onclick="openCandidateDrawer(null)">+ Nieuwe collega</button><button class="btn sm" style="margin-left:8px" onclick="openBatchUpload()">Batch CV upload</button>';
  else                      el.innerHTML = '';
}

function renderView() {
  updateBadges();
  if (activeView === 'vandaag')       { renderVandaag(); return; }
  if (activeView === 'rollen')        { renderRollenView(); return; }
  if (activeView === 'team')          { renderTeamView(); return; }
  if (activeView === 'instellingen')  { renderInstellingen(); return; }
  // Legacy redirects
  if (['dashboard','mails','dagverwerking','portalbuddy'].includes(activeView)) { renderVandaag(); return; }
  if (['aanvragen','concepten'].includes(activeView)) { renderRollenView(); return; }
  if (['kandidaten','kalender'].includes(activeView)) { renderTeamView(); return; }
}

// ── Vandaag view ──────────────────────────────────────────────────────────────

function renderVandaag() {
  const el = document.getElementById('view');
  const openKanalen = KANALEN.filter(k => k.status === 'nieuw' || k.status === 'in_behandeling');
  const nu = new Date();
  const vandaagDeadline = openKanalen.filter(k => {
    if (!k.deadline) return false;
    const d = new Date(k.deadline);
    return d <= new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + 2);
  });

  let h = '';

  // Invoer blok
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">';

  // Mail upload
  h += '<div class="card" style="padding:16px">';
  h += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin-bottom:10px">Mails uploaden</div>';
  h += '<div class="upload-zone" id="vdMailDrop" style="padding:16px;margin-bottom:8px"><strong>Sleep .eml of .msg bestanden</strong><br><span style="font-size:12px">of klik om te kiezen</span></div>';
  h += '<input type="file" id="vdMailInput" multiple accept=".eml,.msg,.txt,.zip" style="display:none">';
  if (PENDING_MAILS.length) {
    h += '<div style="display:flex;gap:8px;margin-top:8px">';
    h += '<button class="btn sm" onclick="startBatchAnalyse()">Analyseren (' + PENDING_MAILS.length + ')</button>';
    h += '<button class="btn ghost sm" onclick="PENDING_MAILS=[];renderVandaag()">Wissen</button>';
    h += '</div>';
  }
  h += '</div>';

  // Tekst plakken
  h += '<div class="card" style="padding:16px">';
  h += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);margin-bottom:10px">Tekst plakken (portal / WhatsApp)</div>';
  h += '<textarea id="vdTekst" placeholder="Plak hier een aanvraag uit een portal, WhatsApp of andere bron..." style="width:100%;height:110px;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:13px;resize:none;font-family:var(--sans)"></textarea>';
  h += '<button class="btn sm" style="margin-top:8px" onclick="vdTekstAnalyse()">Analyseren</button>';
  h += '</div>';
  h += '</div>';

  if (vandaagDeadline.length) {
    h += '<div class="section-label">Deadline nadert</div><div class="card">';
    vandaagDeadline.forEach(k => {
      const rol = ROLLEN.find(r => r.id === k.rol_id);
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      const dl = dlInfo(k.deadline);
      h += '<div class="row" onclick="window._openRol(this.dataset.id)" data-id=' + k.rol_id + ' style="cursor:pointer">';
      h += '<div class="body"><div class="title">' + (rol ? esc(rol.functietitel) : '?') + ' <span style="font-size:12px;color:var(--slate);font-weight:400">via ' + esc(k.broker_naam) + '</span></div>';
      h += '<div class="meta">' + (rol ? esc(rol.klant || '') : '') + (cand ? ' - kandidaat: <b>' + esc(cand.naam) + '</b>' : '') + '</div></div>';
      h += '<div class="right">' + kanaalStatusPill(k.status) + '<span class="dl soon">' + dl.txt + '</span>';
      if (k.opgepakt_door) h += '<span style="font-size:10px;font-family:var(--mono);background:var(--moss);color:#fff;padding:2px 8px;border-radius:20px">' + esc(k.opgepakt_door) + '</span>';
      h += '</div></div>';
    });
    h += '</div>';
  }

  if (openKanalen.length) {
    h += '<div class="section-label">Open (' + openKanalen.length + ')</div><div class="card">';
    openKanalen.filter(k => !vandaagDeadline.includes(k)).slice(0, 15).forEach(k => {
      const rol = ROLLEN.find(r => r.id === k.rol_id);
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      h += '<div class="row" onclick="window._openRol(this.dataset.id)" data-id=' + k.rol_id + ' style="cursor:pointer">';
      h += '<div class="body"><div class="title">' + (rol ? esc(rol.functietitel) : '?') + ' <span style="font-size:12px;color:var(--slate);font-weight:400">via ' + esc(k.broker_naam) + '</span></div>';
      h += '<div class="meta">' + (rol ? esc(rol.klant || '') : '') + (cand ? ' - ' + esc(cand.naam) : '') + (k.deadline ? ' - ' + dlInfo(k.deadline).txt : '') + '</div></div>';
      h += '<div class="right">' + kanaalStatusPill(k.status);
      if (k.opgepakt_door) h += '<span style="font-size:10px;font-family:var(--mono);background:var(--moss);color:#fff;padding:2px 8px;border-radius:20px">' + esc(k.opgepakt_door) + '</span>';
      h += '</div></div>';
    });
    h += '</div>';
  }

  if (!openKanalen.length && !PENDING_MAILS.length) {
    h += '<div class="empty"><div class="big">Alles bijgewerkt</div>Upload mails of plak een aanvraag om te beginnen.</div>';
  }

  el.innerHTML = h;
  wireVdUpload();
}

function wireVdUpload() {
  const drop = document.getElementById('vdMailDrop'), inp = document.getElementById('vdMailInput');
  if (!drop || !inp) return;
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handleMailFiles(e.dataTransfer.files); setTimeout(() => renderVandaag(), 200); };
  inp.onchange = e => { handleMailFiles(e.target.files); inp.value = ''; setTimeout(() => renderVandaag(), 200); };
}

async function vdTekstAnalyse() {
  const txt = document.getElementById('vdTekst')?.value.trim();
  if (!txt) { toast('Plak eerst een aanvraag tekst.'); return; }
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in.'); return; }
  toast('Analyseren...', true);
  try {
    const sys = 'Je analyseert interim-aanvragen. Geef ALLEEN geldige JSON terug, geen uitleg.';
    const usr = 'Analyseer de aanvraag en geef JSON met deze velden (strings of null):\n'
      + '{"functietitel":"","klant":"","locatie":"","startdatum":"","duur":"","uren_per_week":"","tarief_max":"","deadline":"","eisen":[],"wensen":[],"role_type":""}\n\nTEKST:\n' + txt;
    const parsed = pj(await claude(sys, usr, 1400));
    await openRolDrawerMetData({ ...parsed, omschrijving: txt, bron_type: 'portal' });
    document.getElementById('vdTekst').value = '';
  } catch(e) { toast('Fout: ' + e.message); }
}

function kanaalStatusPill(status) {
  const map = {
    nieuw: 'background:#fff;color:var(--slate)',
    in_behandeling: 'background:#e3eee4;color:var(--moss-deep);border-color:#a9c4ad',
    verstuurd: 'background:#fbf3df;color:#8a6a18;border-color:#d9c08a',
    afgewezen: 'background:#f6e4dc;color:#7a3520;border-color:#dba893',
    gewonnen: 'background:#2f4733;color:#fff;border-color:#2f4733'
  };
  const label = { nieuw: 'Nieuw', in_behandeling: 'In behandeling', verstuurd: 'Verstuurd', afgewezen: 'Afgewezen', gewonnen: 'Gewonnen' }[status] || status;
  return '<span style="font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:20px;border:1px solid var(--line);white-space:nowrap;' + (map[status] || '') + '">' + label + '</span>';
}

// ── Rollen view ───────────────────────────────────────────────────────────────

function renderRollenView() {
  const el = document.getElementById('view');
  if (!ROLLEN.length) {
    el.innerHTML = '<div class="empty"><div class="big">Nog geen rollen</div>Voeg een rol toe via de knop rechtsboven of upload mails via Vandaag.</div>';
    return;
  }
  const open = ROLLEN.filter(r => r.status === 'open');
  const afgerond = ROLLEN.filter(r => r.status !== 'open');
  let h = '';
  if (open.length) {
    h += '<div class="section-label" style="margin-top:0">Open rollen (' + open.length + ')</div>';
    open.forEach(rol => { h += rolKaart(rol); });
  }
  if (afgerond.length) {
    h += '<div class="section-label">Afgerond / Gearchiveerd</div>';
    afgerond.slice(0, 5).forEach(rol => { h += rolKaart(rol, true); });
  }
  el.innerHTML = h;
}

function rolKaart(rol, gedimmd = false) {
  const kanalen = KANALEN.filter(k => k.rol_id === rol.id);
  const dl = dlInfo(rol.deadline);
  let h = '<div class="card" style="margin-bottom:14px;' + (gedimmd ? 'opacity:.6' : '') + '">';
  h += '<div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;gap:12px;cursor:pointer" onclick="window._openRol(this.dataset.id)" data-id=' + rol.id + '>';
  h += '<div style="flex:1">';
  h += '<div style="font-weight:700;font-size:15px;margin-bottom:2px">' + esc(rol.functietitel) + '</div>';
  h += '<div style="font-size:12px;color:var(--ink-soft)">' + esc(rol.klant || 'Klant onbekend') + (rol.locatie ? ' - ' + esc(rol.locatie) : '') + (rol.uren_per_week ? ' - ' + esc(rol.uren_per_week) + 'u' : '') + '</div>';
  h += '</div>';
  if (dl.txt !== '-') h += '<span class="dl ' + (dl.soon ? 'soon' : '') + '" style="font-size:11.5px">' + dl.txt + '</span>';
  h += '<button class="btn ghost sm" onclick="event.stopPropagation();window._openRol(this.dataset.id)" data-id=' + rol.id + '>Bekijken</button>';
  h += '</div>';

  if (kanalen.length) {
    h += '<div style="padding:0 16px">';
    kanalen.forEach(k => {
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      const typeIcon = { mail: '@', portal: 'P', telefoon: 'T', whatsapp: 'W' }[k.type] || '?';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--paper-2)">';
      h += '<span style="font-family:var(--mono);font-size:10px;background:var(--paper-2);padding:2px 7px;border-radius:4px;width:14px;text-align:center">' + typeIcon + '</span>';
      h += '<span style="font-weight:600;font-size:13px;min-width:100px">' + esc(k.broker_naam) + '</span>';
      const kNaam = cand?.naam || k.kandidaat_naam || null;
      h += '<span style="font-size:12px;color:var(--ink-soft);flex:1">' + (kNaam ? esc(kNaam) : '<span style="color:var(--rust)">geen kandidaat</span>') + '</span>';
      if (k.opgepakt_door) h += '<span style="font-size:11px;color:var(--moss);font-family:var(--mono)">' + esc(k.opgepakt_door) + '</span>';
      h += kanaalStatusPill(k.status);
      h += '</div>';
    });
    h += '</div>';
  } else {
    h += '<div style="padding:10px 16px;font-size:12px;color:var(--slate)">Nog geen kanalen. Open de rol om kanalen toe te voegen.</div>';
  }

  h += '<div style="padding:10px 16px;display:flex;gap:7px">';
  h += '<button class="btn ghost sm" onclick="window._openRol(this.dataset.id)" data-id=' + rol.id + '>+ Kanaal toevoegen</button>';
  h += '<button class="btn ghost sm" onclick="window._openRol(this.dataset.id)" data-id=' + rol.id + '>Bewerken</button>';
  h += '<button class="btn danger sm" style="margin-left:auto" onclick="window._verwijderRol(this.dataset.id)" data-id=' + rol.id + '>Verwijderen</button>';
  h += '</div></div>';
  return h;
}

// ── Team view ─────────────────────────────────────────────────────────────────

function renderTeamView() {
  const el = document.getElementById('view');
  let h = '<div class="section-label" style="margin-top:0">Beschikbaarheidskalender</div>';
  h += '<div id="teamKalContainer" style="margin-bottom:24px">' + buildKalenderHtml() + '</div>';
  h += '<div class="section-label">Collegas (' + CANDIDATES.length + ')</div>';
  h += renderKandidaten();
  el.innerHTML = h;
  wireKalender();
}

// ── Kandidaten ────────────────────────────────────────────────────────────────

function renderKandidaten() {
  if (!CANDIDATES.length) return '<div class="empty"><div class="big">Nog geen kandidaten</div>Voeg een kandidaat toe of upload meerdere CVs tegelijk via de knop rechtsboven.</div>';
  let h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">';
  CANDIDATES.forEach(c => {
    const hasBron = !!(c.cv_bron?.tekst);
    const kalEntries = KALENDER.filter(e => e.kandidaat_id === c.id);
    const beschikbaarLabel = kalEntries.length
      ? kalEntries.map(e => MAAND_NAMEN[e.maand - 1] + ' ' + e.jaar + (e.rol ? ' (' + e.rol + ')' : '')).join(', ')
      : (c.beschikbaar || 'onbekend');
    const nuDate = new Date();
    const beschikbaarDt = c.beschikbaar ? new Date(c.beschikbaar) : null;
    const isBeschikbaar = beschikbaarDt && beschikbaarDt <= new Date(nuDate.getFullYear(), nuDate.getMonth() + 1, 1);
    const statusKleur = isBeschikbaar ? 'background:#e3eee4;color:#2f4733;border-color:#a9c4ad' : 'background:#fbf3df;color:#8a6a18;border-color:#d9c08a';
    const statusLabel = isBeschikbaar ? 'Beschikbaar' : 'Ingepland';

    h += '<div class="card" style="overflow:visible">';
    h += '<div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;gap:10px">';
    h += '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px;margin-bottom:2px">' + esc(c.naam) + '</div>';
    h += '<div style="font-size:12px;color:var(--ink-soft)">' + esc(c.senioriteit) + ' · EUR ' + esc(c.tarief || '?') + '/u · ' + esc(c.locatie || '?') + '</div></div>';
    h += '<span style="font-size:11px;padding:3px 9px;border-radius:20px;border:1px solid;white-space:nowrap;' + statusKleur + '">' + statusLabel + '</span>';
    h += '</div>';

    h += '<div style="padding:10px 16px;border-bottom:1px solid var(--paper-2);font-size:12px;display:flex;gap:6px;align-items:center">';
    h += '<span style="color:var(--ink-soft);font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.08em">Beschikbaar</span>';
    h += '<span style="font-weight:600">' + esc(beschikbaarLabel) + '</span>';
    h += '</div>';

    h += '<div style="padding:10px 16px;border-bottom:1px solid var(--paper-2)" id="rolcv_kaart_' + c.id + '">';
    h += '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin-bottom:8px">CV versies per rol</div>';
    h += '<div id="rolcv_kaart_items_' + c.id + '"><div style="font-size:12px;color:var(--slate)">Laden...</div></div>';
    h += '</div>';

    h += '<div style="padding:10px 16px;border-bottom:1px solid var(--paper-2)"><div class="chips">' + ((c.skills || []).slice(0, 8).map(s => '<span class="chip">' + esc(s) + '</span>').join('')) + '</div></div>';

    h += '<div style="padding:10px 16px;display:flex;gap:7px;flex-wrap:wrap">';
    h += '<button class="btn ghost sm" onclick="openCandidateDrawer(&quot;' + c.id + '&quot;)">Bewerken</button>';
    if (hasBron) h += '<button class="btn ghost sm" onclick="quickViewCV(&quot;' + c.id + '&quot;)">CV bekijken</button>';
    h += '<button class="btn danger sm" style="margin-left:auto" onclick="verwijderKandidaat(&quot;' + c.id + '&quot;,&quot;' + esc(c.naam) + '&quot;)">Verwijderen</button>';
    h += '</div></div>';
  });
  h += '</div>';

  setTimeout(() => {
    CANDIDATES.forEach(c => { if (!c.id.startsWith('c_')) laadRolCVKaart(c.id); });
  }, 100);
  return h;
}

async function laadRolCVKaart(candId) {
  const el = document.getElementById('rolcv_kaart_items_' + candId);
  if (!el) return;
  try {
    const versies = await DB.getCVVersiesVanKandidaat(candId);
    const rolVersies = versies.filter(v => v.roltype);
    if (!rolVersies.length) {
      el.innerHTML = '<div style="font-size:12px;color:var(--slate)">Nog geen rol-CVs. Voeg toe via Bewerken.</div>';
      return;
    }
    const perRol = {};
    rolVersies.forEach(v => { perRol[v.roltype] = v; });
    el.innerHTML = Object.entries(perRol).map(([rol, v]) =>
      '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--paper-2)">'
      + '<span style="font-family:var(--mono);font-size:10px;background:var(--paper-2);padding:2px 8px;border-radius:4px;white-space:nowrap">' + esc(rol) + '</span>'
      + '<span style="font-size:12px;flex:1;color:var(--ink-soft)">' + esc(v.versie_naam || 'CV.docx') + '</span>'
      + '<button class="btn ghost sm" onclick="downloadRolCV(\'' + candId + '\',\'' + esc(rol) + '\')">Download</button>'
      + '</div>'
    ).join('');
  } catch(e) { if (el) el.innerHTML = '<div style="font-size:12px;color:var(--rust)">' + esc(e.message) + '</div>'; }
}

async function downloadRolCV(candId, roltype) {
  try {
    toast('CV ophalen...', true);
    const path = 'rolcv/' + candId + '/' + roltype.replace(/[^a-zA-Z0-9]/g, '_') + '.docx';
    const { data, error } = await sb.storage.from('cv-bestanden').createSignedUrl(path, 300);
    if (error || !data) { toast('CV niet gevonden in storage.'); return; }
    window.open(data.signedUrl, '_blank');
    toast('CV geopend.');
  } catch(e) { toast('Fout: ' + e.message); }
}

// ── Instellingen ──────────────────────────────────────────────────────────────

function renderInstellingen() {
  const s = SETTINGS;
  document.getElementById('view').innerHTML = `<div style="max-width:700px">
  <div class="panel">
   <h3>CV-template</h3>
   <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0">Upload het CV/profiel-template dat aangehouden moet worden bij het herschrijven. De tekst wordt als stijlreferentie aan Claude meegegeven.</p>
   <div class="upload-zone" id="tmplDrop">${s.template_naam ? `Huidig: <b>${esc(s.template_naam)}</b> - klik om te vervangen` : 'Sleep hier je template (.pdf, .docx, .txt) of klik'}</div>
   <input type="file" id="tmplInput" accept=".pdf,.docx,.txt" style="display:none">
   ${s.template_tekst ? `<div class="filechip">📄 ${esc(s.template_naam)} <span style="color:var(--slate);font-size:11px;margin-left:6px">${s.template_tekst.length} tekens</span><span class="x" onclick="clearTemplate()">×</span></div>` : ''}
  </div>
  <div class="panel"><h3>Stijl</h3>
   <div class="field"><label>Stijlinstructie voor CV en mail</label>
    <textarea id="s_stijl" rows="3">${esc(s.stijlinstructie || 'Professioneel, kort, concreet, Nederlands. Geen overdreven verkooppraat.')}</textarea></div>
  </div>
  <div class="panel"><h3>Afzender & ondertekening</h3>
   <div class="two-col">
    <div class="field"><label>Naam</label><input id="s_naam" value="${esc(s.afzender_naam || '')}"></div>
    <div class="field"><label>Functie</label><input id="s_functie" value="${esc(s.afzender_functie || '')}"></div>
    <div class="field"><label>E-mail</label><input id="s_email" value="${esc(s.afzender_email || '')}"></div>
    <div class="field"><label>Telefoon</label><input id="s_tel" value="${esc(s.afzender_telefoon || '')}"></div>
    <div class="field"><label>Bedrijf</label><input id="s_bedrijf" value="${esc(s.bedrijf || '')}"></div>
    <div class="field"><label>Ondertekening-opening</label><input id="s_onder" value="${esc(s.ondertekening || 'Met vriendelijke groet,')}"></div>
   </div>
  </div>
  <div class="panel"><h3>Teamleden</h3>
   <div id="teamleden_lijst" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
    ${TEAMLEDEN.map(t => `<div class="filechip">${esc(t.naam)}<span class="x" onclick="verwijderTeamlid(${t.id})">x</span></div>`).join('')}
   </div>
   <div style="display:flex;gap:8px">
    <input id="nieuw_teamlid" placeholder="Naam nieuw teamlid" style="flex:1;border:1px solid var(--line);border-radius:7px;padding:8px 10px;font-size:13px">
    <button class="btn sm" onclick="voegTeamlidToe()">Toevoegen</button>
   </div>
  </div>
  <button class="btn" onclick="saveSettings()">Instellingen opslaan</button>
 </div>`;

  const drop = document.getElementById('tmplDrop'), inp = document.getElementById('tmplInput');
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handleTemplate(e.dataTransfer.files[0]); };
  inp.onchange = e => { if (e.target.files[0]) handleTemplate(e.target.files[0]); };
}

async function handleTemplate(file) {
  toast('Template inlezen…', true);
  try {
    const txt = await extractFileText(file);
    SETTINGS.template_naam = file.name;
    SETTINGS.template_tekst = txt.slice(0, 8000);
    await DB.saveInstellingen(SETTINGS);
    toast('Template opgeslagen.');
    renderInstellingen();
  } catch(e) { toast('Fout: ' + e.message); }
}

async function clearTemplate() {
  SETTINGS.template_naam = null;
  SETTINGS.template_tekst = null;
  await DB.saveInstellingen(SETTINGS);
  renderInstellingen();
}

async function saveSettings() {
  SETTINGS.stijlinstructie   = document.getElementById('s_stijl').value;
  SETTINGS.afzender_naam     = document.getElementById('s_naam').value;
  SETTINGS.afzender_functie  = document.getElementById('s_functie').value;
  SETTINGS.afzender_email    = document.getElementById('s_email').value;
  SETTINGS.afzender_telefoon = document.getElementById('s_tel').value;
  SETTINGS.bedrijf           = document.getElementById('s_bedrijf').value;
  SETTINGS.ondertekening     = document.getElementById('s_onder').value;
  await DB.saveInstellingen(SETTINGS);
  toast('Instellingen opgeslagen.');
}

async function voegTeamlidToe() {
  const naam = document.getElementById('nieuw_teamlid')?.value.trim();
  if (!naam) { toast('Voer een naam in.'); return; }
  try {
    await DB.upsertTeamlid({ naam });
    TEAMLEDEN = await DB.getTeamleden();
    document.getElementById('nieuw_teamlid').value = '';
    const el = document.getElementById('teamleden_lijst');
    if (el) el.innerHTML = TEAMLEDEN.map(t => `<div class="filechip">${esc(t.naam)}<span class="x" onclick="verwijderTeamlid(${t.id})">x</span></div>`).join('');
    toast(naam + ' toegevoegd.');
  } catch(e) { toast('Fout: ' + e.message); }
}

async function verwijderTeamlid(id) {
  if (!confirm('Teamlid verwijderen?')) return;
  await DB.deleteTeamlid(id);
  TEAMLEDEN = await DB.getTeamleden();
  const el = document.getElementById('teamleden_lijst');
  if (el) el.innerHTML = TEAMLEDEN.map(t => `<div class="filechip">${esc(t.naam)}<span class="x" onclick="verwijderTeamlid(${t.id})">x</span></div>`).join('');
  toast('Verwijderd.');
}

function openInvoerDrawer() {
  setView('vandaag');
}
