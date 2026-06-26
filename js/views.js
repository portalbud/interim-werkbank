// ── View router ───────────────────────────────────────────────────────────────

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  vandaag: 'Vandaag',
  rollen: 'Aanvragen',
  professionals: 'Professionals',
  kalender: 'Kalender',
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
  if (v === 'vandaag')      el.innerHTML = '';
  else if (v === 'rollen')  el.innerHTML = (window._toonArchief
    ? '<button class="btn ghost sm" onclick="window._toonArchief=false;renderTopActions(\'rollen\');renderRollenView()">← Actief</button>'
    : '<button class="btn ghost sm" onclick="window._toonArchief=true;renderTopActions(\'rollen\');renderRollenView()">Archief</button><button class="btn ghost sm" onclick="openRolDrawer(null)">+ Nieuwe rol</button>');
  else if (v === 'professionals') el.innerHTML = '<button class="btn ghost sm" onclick="openCandidateDrawer(null)">+ Nieuwe professional</button><button class="btn sm" style="margin-left:8px" onclick="openBatchUpload()">Batch CV upload</button>';
  else                      el.innerHTML = '';
}

function renderView() {
  updateBadges();
  if (activeView === 'dashboard')     { renderDashboard(); return; }
  if (activeView === 'vandaag')       { renderVandaag(); return; }
  if (activeView === 'rollen')        { renderRollenView(); return; }
  if (activeView === 'professionals')  { renderProfessionalsView(); return; }
  if (activeView === 'kalender')       { renderKalenderView(); return; }
  if (activeView === 'instellingen')  { renderInstellingen(); return; }
  // Legacy redirects
  if (['dashboard','mails','dagverwerking','portalbuddy'].includes(activeView)) { renderVandaag(); return; }
  if (['aanvragen','concepten'].includes(activeView)) { renderRollenView(); return; }
  if (['kandidaten','team'].includes(activeView)) { renderProfessionalsView(); return; }
}

// ── Dashboard view ────────────────────────────────────────────────────────────

function renderDashboard() {
  const el = document.getElementById('view');
  const nu = new Date();
  const over7 = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + 7);

  const statussen = ['nieuw', 'in_behandeling', 'verstuurd', 'gewonnen', 'afgewezen'];
  const labels    = { nieuw: 'Nieuw', in_behandeling: 'In behandeling', verstuurd: 'Verstuurd', gewonnen: 'Gewonnen', afgewezen: 'Afgewezen' };
  const kleuren   = {
    nieuw:         { bg: 'var(--white)',   clr: 'var(--slate)',    border: 'var(--line)' },
    in_behandeling:{ bg: '#e3eee4',        clr: 'var(--moss-deep)',border: '#a9c4ad' },
    verstuurd:     { bg: '#fbf3df',        clr: '#8a6a18',         border: '#d9c08a' },
    gewonnen:      { bg: '#2f4733',        clr: '#fff',            border: '#2f4733' },
    afgewezen:     { bg: '#f6e4dc',        clr: '#7a3520',         border: '#dba893' }
  };

  const counts = {};
  statussen.forEach(s => counts[s] = KANALEN.filter(k => k.status === s).length);

  // ── Block 1: Pipeline ─────────────────────────────────────────────────────
  let h = '<div class="section-label" style="margin-top:0">Pipeline</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px">';
  statussen.forEach(s => {
    const k = kleuren[s];
    h += `<div style="border:1px solid ${k.border};border-radius:10px;padding:16px;background:${k.bg};text-align:center">
      <div style="font-size:30px;font-weight:700;color:${k.clr};font-family:var(--mono)">${counts[s]}</div>
      <div style="font-size:10px;color:${k.clr};opacity:.85;margin-top:5px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em">${labels[s]}</div>
    </div>`;
  });
  h += '</div>';

  if (counts['gewonnen'] + counts['afgewezen'] > 0) {
    const winRate = Math.round(counts['gewonnen'] / (counts['gewonnen'] + counts['afgewezen']) * 100);
    h += `<div style="margin-bottom:24px;font-size:12.5px;color:var(--ink-soft)">
      Win rate: <b style="color:var(--moss-deep)">${winRate}%</b>
      <span style="color:var(--line);margin:0 6px">·</span>
      ${counts['gewonnen']} gewonnen van ${counts['gewonnen'] + counts['afgewezen']} afgerond
    </div>`;
  } else {
    h += '<div style="margin-bottom:24px"></div>';
  }

  // ── Block 2: Deadlines komende 7 dagen ────────────────────────────────────
  const deadlines = KANALEN
    .filter(k => {
      if (!k.deadline || k.status === 'gewonnen' || k.status === 'afgewezen') return false;
      return new Date(k.deadline) <= over7;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  h += `<div class="section-label">Deadlines komende 7 dagen (${deadlines.length})</div>`;
  if (!deadlines.length) {
    h += '<div class="card" style="padding:14px 16px;font-size:12.5px;color:var(--slate);margin-bottom:24px">Geen deadlines de komende week.</div>';
  } else {
    h += '<div class="card" style="margin-bottom:24px">';
    deadlines.forEach(k => {
      const rol  = ROLLEN.find(r => r.id === k.rol_id);
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      const dl   = dlInfo(k.deadline);
      h += `<div class="row" onclick="window._openRol('${k.rol_id}')" style="cursor:pointer">
        <div class="body">
          <div class="title">${esc(rol?.functietitel || '?')} <span style="font-size:12px;color:var(--slate);font-weight:400">via ${esc(k.broker_naam)}</span></div>
          <div class="meta">${cand ? esc(cand.naam) : '<span style="color:var(--rust)">geen kandidaat</span>'}${k.opgepakt_door ? ' · ' + esc(k.opgepakt_door) : ''}</div>
        </div>
        <div class="right">
          ${kanaalStatusPill(k.status)}
          <span class="dl${dl.days <= 1 ? ' soon' : ''}">${dl.txt}</span>
        </div>
      </div>`;
    });
    h += '</div>';
  }

  // ── Block 3: Per teamlid ──────────────────────────────────────────────────
  h += '<div class="section-label">Per teamlid</div>';

  if (!TEAMLEDEN.length) {
    h += '<div class="card" style="padding:14px 16px;font-size:12.5px;color:var(--slate)">Geen teamleden ingesteld. Voeg teamleden toe via Instellingen.</div>';
  } else {
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">';

    TEAMLEDEN.forEach(t => {
      const eigen  = KANALEN.filter(k => k.opgepakt_door === t.naam);
      const actief = eigen.filter(k => k.status !== 'gewonnen' && k.status !== 'afgewezen');
      h += `<div class="card" style="padding:14px 16px">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px">${esc(t.naam)}</div>`;
      if (!eigen.length) {
        h += '<div style="font-size:12px;color:var(--slate)">Niets opgepakt</div>';
      } else {
        h += '<div style="display:flex;flex-direction:column;gap:6px">';
        statussen.forEach(s => {
          const n = eigen.filter(k => k.status === s).length;
          if (!n) return;
          const kl = kleuren[s];
          h += `<div style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${kl.bg};border:1.5px solid ${kl.border};flex-shrink:0"></span>
            <span style="font-size:12.5px;flex:1;color:var(--ink)">${labels[s]}</span>
            <span style="font-size:13px;font-family:var(--mono);font-weight:700">${n}</span>
          </div>`;
        });
        h += `</div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-soft)">
          ${actief.length} actief · ${eigen.length} totaal
        </div>`;
      }
      h += '</div>';
    });

    const nietOpgepakt = KANALEN.filter(k => !k.opgepakt_door && k.status !== 'gewonnen' && k.status !== 'afgewezen').length;
    if (nietOpgepakt > 0) {
      h += `<div class="card" style="padding:14px 16px;border-color:var(--rust)">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--rust)">Niet opgepakt</div>
        <div style="font-size:30px;font-weight:700;font-family:var(--mono)">${nietOpgepakt}</div>
        <div style="font-size:12px;color:var(--slate);margin-top:4px">kanalen zonder toewijzing</div>
      </div>`;
    }

    h += '</div>';
  }

  el.innerHTML = h;
}

// ── Vandaag view ──────────────────────────────────────────────────────────────

function renderVandaag() {
  const el = document.getElementById('view');
  const nu = new Date();
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());

  // ── Helpers ───────────────────────────────────────────────────────────────
  function deadlineMeta(deadline) {
    if (!deadline) return { label: '', clr: 'var(--slate)', diff: 99 };
    const d = new Date(deadline);
    const diff = Math.floor((d - vandaag) / 86400000);
    if (diff < 0)       return { label: 'verlopen',              clr: '#c0614a', diff };
    if (diff === 0)     return { label: 'vandaag',               clr: '#c0614a', diff };
    if (diff === 1)     return { label: 'morgen',                clr: '#d48a2e', diff };
    if (diff <= 7)      return { label: dlInfo(deadline).txt,    clr: '#8a6a18', diff };
    return               { label: dlInfo(deadline).txt,          clr: 'var(--slate)', diff };
  }

  function dotClr(k, cand) {
    const { diff } = deadlineMeta(k.deadline);
    if (!cand)       return '#c0614a';
    if (diff <= 0)   return '#c0614a';
    if (diff <= 1)   return '#d48a2e';
    return 'var(--line)';
  }

  function actieChip(k, cand) {
    if (!cand)
      return `<span style="font-size:11px;padding:2px 9px;border-radius:4px;background:#fdecea;color:#c0614a;font-family:var(--mono);white-space:nowrap">Kandidaat kiezen</span>`;
    if (k.status === 'nieuw')
      return `<span style="font-size:11px;padding:2px 9px;border-radius:4px;background:var(--paper-2);color:var(--slate);font-family:var(--mono);white-space:nowrap">CV klaarzetten</span>`;
    return `<span style="font-size:11px;padding:2px 9px;border-radius:4px;background:#e3eee4;color:var(--moss-deep);font-family:var(--mono);white-space:nowrap">Opvolgen</span>`;
  }

  function sectionHeader(label, count) {
    return `<div style="font-size:10.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.1em;font-family:var(--mono);padding:0 4px;margin-bottom:4px">${label} · ${count}</div>`;
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const actief = KANALEN
    .filter(k => k.status === 'nieuw' || k.status === 'in_behandeling')
    .sort((a, b) => {
      // Geen kandidaat bovenaan, dan op deadline
      const noCandA = !a.kandidaat_id, noCandB = !b.kandidaat_id;
      if (noCandA !== noCandB) return noCandA ? -1 : 1;
      const dA = a.deadline ? new Date(a.deadline) : new Date('2099-01-01');
      const dB = b.deadline ? new Date(b.deadline) : new Date('2099-01-01');
      return dA - dB;
    });

  const verstuurd = KANALEN.filter(k => k.status === 'verstuurd');

  let h = '';

  // ── Taken ─────────────────────────────────────────────────────────────────
  if (actief.length) {
    h += sectionHeader('Actie vereist', actief.length);
    actief.forEach(k => {
      const rol  = ROLLEN.find(r => r.id === k.rol_id);
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      const dm   = deadlineMeta(k.deadline);
      const dc   = dotClr(k, cand);

      h += `<div class="vd-task" onclick="window._openRol('${k.rol_id}')" style="display:flex;align-items:flex-start;gap:13px;padding:9px 6px;border-radius:8px;cursor:pointer;margin-bottom:1px">
        <div style="width:17px;height:17px;border-radius:50%;border:2px solid ${dc};flex-shrink:0;margin-top:3px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.3">
            ${esc(rol?.functietitel || '?')}
            <span style="font-weight:400;color:var(--ink-soft)"> · ${esc(k.broker_naam)}</span>
          </div>
          <div style="font-size:12px;color:var(--slate);margin-top:2px">
            ${esc(rol?.klant || '')}${cand
              ? ' · <span style="color:var(--ink-soft);font-weight:500">' + esc(cand.naam) + '</span>'
              : ' · <span style="color:#c0614a">geen kandidaat</span>'}
            ${k.opgepakt_door ? ' · <span style="color:var(--moss)">' + esc(k.opgepakt_door) + '</span>' : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;padding-top:2px">
          ${actieChip(k, cand)}
          ${dm.label ? `<span style="font-size:11px;font-family:var(--mono);color:${dm.clr};white-space:nowrap">${dm.label}</span>` : ''}
        </div>
      </div>`;
    });
  }

  // ── Verstuurd ─────────────────────────────────────────────────────────────
  if (verstuurd.length) {
    h += `<div style="margin-top:22px"></div>`;
    h += sectionHeader('Verstuurd', verstuurd.length);
    verstuurd.forEach(k => {
      const rol  = ROLLEN.find(r => r.id === k.rol_id);
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      const dm   = deadlineMeta(k.deadline);
      h += `<div class="vd-task" onclick="window._openRol('${k.rol_id}')" style="display:flex;align-items:center;gap:13px;padding:8px 6px;border-radius:8px;cursor:pointer;opacity:.5;margin-bottom:1px">
        <div style="width:17px;height:17px;border-radius:50%;border:2px solid var(--line);flex-shrink:0"></div>
        <div style="flex:1;min-width:0;font-size:13px;color:var(--ink)">
          ${esc(rol?.functietitel || '?')}
          <span style="color:var(--slate)"> · ${esc(k.broker_naam)}${cand ? ' · ' + esc(cand.naam) : ''}</span>
        </div>
        ${dm.label ? `<span style="font-size:11px;font-family:var(--mono);color:${dm.clr}">${dm.label}</span>` : ''}
      </div>`;
    });
  }

  // ── Leeg ──────────────────────────────────────────────────────────────────
  if (!actief.length && !verstuurd.length) {
    h += '<div class="empty" style="padding-top:40px"><div class="big">Alles bijgewerkt ✓</div>Geen openstaande acties.</div>';
  }

  // ── Nieuwe aanvraag (onderaan, secundair) ─────────────────────────────────
  h += `<div style="margin-top:32px;border-top:1px solid var(--line);padding-top:20px">
    <div style="font-size:10.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.1em;font-family:var(--mono);margin-bottom:12px;padding:0 4px">Nieuwe aanvraag verwerken</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="border:1.5px dashed var(--line);border-radius:9px;padding:14px 16px;cursor:pointer;transition:.1s" id="vdMailDrop"
           onmouseover="this.style.borderColor='var(--moss)'" onmouseout="this.style.borderColor='var(--line)'"
           onclick="document.getElementById('vdMailInput').click()">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:3px">Mails uploaden</div>
        <div style="font-size:12px;color:var(--slate)">.eml of .msg bestanden slepen of klikken</div>
        ${PENDING_MAILS.length ? `<div style="margin-top:10px;display:flex;gap:6px">
          <button class="btn sm" onclick="event.stopPropagation();startBatchAnalyse()">Analyseren (${PENDING_MAILS.length})</button>
          <button class="btn ghost sm" onclick="event.stopPropagation();PENDING_MAILS=[];renderVandaag()">×</button>
        </div>` : ''}
      </div>
      <div style="border:1.5px dashed var(--line);border-radius:9px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px">Tekst plakken</div>
        <textarea id="vdTekst" placeholder="Portal, WhatsApp, mail…"
          style="width:100%;box-sizing:border-box;height:62px;border:1px solid var(--line);border-radius:7px;padding:8px 10px;font-size:12.5px;resize:none;font-family:var(--sans);background:var(--white);color:var(--ink)"></textarea>
        <button class="btn sm" style="margin-top:8px" onclick="vdTekstAnalyse()">Analyseren</button>
      </div>
    </div>
    <input type="file" id="vdMailInput" multiple accept=".eml,.msg,.txt,.zip" style="display:none">
  </div>`;

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
  const archief = !!window._toonArchief;

  if (archief) {
    const gearchiveerd = ROLLEN.filter(r => r.status === 'gearchiveerd');
    if (!gearchiveerd.length) {
      el.innerHTML = '<div class="empty"><div class="big">Archief is leeg</div>Gearchiveerde aanvragen verschijnen hier.</div>';
      return;
    }
    let h = '<div class="section-label" style="margin-top:0">Archief (' + gearchiveerd.length + ')</div>';
    gearchiveerd.forEach(rol => { h += rolKaart(rol, true); });
    el.innerHTML = h;
    return;
  }

  const actief = ROLLEN.filter(r => r.status !== 'gearchiveerd');
  if (!actief.length) {
    el.innerHTML = '<div class="empty"><div class="big">Nog geen aanvragen</div>Voeg een rol toe via de knop rechtsboven of upload mails via Vandaag.</div>';
    return;
  }
  const open = actief.filter(r => r.status === 'open');
  const afgerond = actief.filter(r => r.status !== 'open');
  let h = '';
  if (open.length) {
    h += '<div class="section-label" style="margin-top:0">Open rollen (' + open.length + ')</div>';
    open.forEach(rol => { h += rolKaart(rol); });
  }
  if (afgerond.length) {
    h += '<div class="section-label">Afgerond</div>';
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

// ── Professionals view ────────────────────────────────────────────────────────

function renderProfessionalsView() {
  const el = document.getElementById('view');
  let h = '<div class="section-label" style="margin-top:0">Professionals (' + CANDIDATES.length + ')</div>';
  h += renderKandidaten();
  el.innerHTML = h;
}

// ── Kalender view ─────────────────────────────────────────────────────────────

function renderKalenderView() {
  const el = document.getElementById('view');
  let h = '<div class="section-label" style="margin-top:0">Beschikbaarheidskalender</div>';
  h += '<div id="teamKalContainer">' + buildKalenderHtml() + '</div>';
  el.innerHTML = h;
  wireKalender();
}

// ── Kandidaten ────────────────────────────────────────────────────────────────

function renderKandidaten() {
  if (!CANDIDATES.length) return '<div class="empty"><div class="big">Nog geen kandidaten</div>Voeg een kandidaat toe of upload meerdere CVs tegelijk via de knop rechtsboven.</div>';

  const nu = new Date();
  const f  = window._candFilter || {};
  const zoek        = f.zoek   || '';
  const statusFilter= f.status || 'alles';
  const rolFilter   = f.rol    || 'alles';

  const alleRollen = [...new Set(CANDIDATES.flatMap(c => c.rollen || []))].sort();

  const filtered = CANDIDATES.filter(c => {
    if (zoek && !c.naam.toLowerCase().includes(zoek.toLowerCase())) return false;
    const dt = c.beschikbaar ? new Date(c.beschikbaar) : null;
    const isBeschikbaar = dt && dt <= new Date(nu.getFullYear(), nu.getMonth() + 1, 1);
    if (statusFilter === 'beschikbaar' && !isBeschikbaar) return false;
    if (statusFilter === 'ingepland'   &&  isBeschikbaar) return false;
    if (rolFilter !== 'alles' && !(c.rollen || []).includes(rolFilter)) return false;
    return true;
  });

  // ── Filterbar ─────────────────────────────────────────────────────────────
  let h = `<div style="display:flex;gap:9px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <input type="text" placeholder="Zoeken op naam…" value="${esc(zoek)}"
      oninput="window._candFilter={...(window._candFilter||{}),zoek:this.value};renderTeamView()"
      style="flex:1;min-width:160px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--white)">
    <select onchange="window._candFilter={...(window._candFilter||{}),status:this.value};renderTeamView()"
      style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--white)">
      <option value="alles"        ${statusFilter==='alles'        ?'selected':''}>Alle statussen</option>
      <option value="beschikbaar"  ${statusFilter==='beschikbaar'  ?'selected':''}>Beschikbaar</option>
      <option value="ingepland"    ${statusFilter==='ingepland'    ?'selected':''}>Ingepland</option>
    </select>
    ${alleRollen.length ? `<select onchange="window._candFilter={...(window._candFilter||{}),rol:this.value};renderTeamView()"
      style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--white)">
      <option value="alles" ${rolFilter==='alles'?'selected':''}>Alle rollen</option>
      ${alleRollen.map(r => `<option value="${esc(r)}" ${rolFilter===r?'selected':''}>${esc(r)}</option>`).join('')}
    </select>` : ''}
    <span style="font-size:12px;color:var(--ink-soft);white-space:nowrap">${filtered.length} van ${CANDIDATES.length}</span>
  </div>`;

  if (!filtered.length) return h + '<div class="empty"><div class="big">Geen resultaten</div>Pas de filters aan.</div>';

  // ── Tabel ─────────────────────────────────────────────────────────────────
  h += `<div class="card" style="overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid var(--line)">
          ${['Naam','Rollen','Tarief','Locatie','Beschikbaar','Status','CV',''].map(t =>
            `<th style="padding:9px 14px;text-align:left;font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);font-weight:600;white-space:nowrap">${t}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>`;

  filtered.forEach(c => {
    const dt = c.beschikbaar ? new Date(c.beschikbaar) : null;
    const isBeschikbaar = dt && dt <= new Date(nu.getFullYear(), nu.getMonth() + 1, 1);
    const sBg     = isBeschikbaar ? '#e3eee4'      : '#fbf3df';
    const sClr    = isBeschikbaar ? '#2f4733'      : '#8a6a18';
    const sBorder = isBeschikbaar ? '#a9c4ad'      : '#d9c08a';
    const sLabel  = isBeschikbaar ? 'Beschikbaar'  : 'Ingepland';
    const hasBron = !!(c.cv_bron?.tekst || c.cv_bron?.opgeslagen);

    h += `<tr style="border-bottom:1px solid var(--paper-2);cursor:pointer"
        onclick="openCandidateDrawer('${c.id}')"
        onmouseover="this.style.background='var(--paper-2)'"
        onmouseout="this.style.background=''">
      <td style="padding:10px 14px;font-weight:600">${esc(c.naam)}</td>
      <td style="padding:10px 14px;color:var(--ink-soft);font-size:12px">${esc((c.rollen||[]).join(' · '))||'—'}</td>
      <td style="padding:10px 14px;font-family:var(--mono);font-size:12px;white-space:nowrap">€${c.tarief||'?'}/u</td>
      <td style="padding:10px 14px;color:var(--ink-soft)">${esc(c.locatie||'—')}</td>
      <td style="padding:10px 14px;font-family:var(--mono);font-size:12px;white-space:nowrap">${c.beschikbaar||'—'}</td>
      <td style="padding:10px 14px">
        <span style="font-size:11px;padding:3px 9px;border-radius:20px;border:1px solid ${sBorder};background:${sBg};color:${sClr};white-space:nowrap">${sLabel}</span>
      </td>
      <td style="padding:10px 14px">
        ${hasBron
          ? '<span style="font-size:11px;background:var(--paper-2);border:1px solid var(--line);padding:2px 7px;border-radius:4px;font-family:var(--mono)">✓ bron</span>'
          : '<span style="font-size:11px;color:var(--slate)">—</span>'}
      </td>
      <td style="padding:10px 14px;text-align:right">
        <button class="btn ghost sm" onclick="event.stopPropagation();openCandidateDrawer('${c.id}')">Bewerken</button>
      </td>
    </tr>`;
  });

  h += '</tbody></table></div>';
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
