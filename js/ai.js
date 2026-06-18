// ── Claude API ────────────────────────────────────────────────────────────────

function claudeKey() {
  return document.getElementById('claudeKey').value.trim();
}

async function claude(system, user, tokens = 1600) {
  const k = claudeKey();
  if (!k) throw new Error('Geen Claude API-sleutel ingevuld.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': k,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: tokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!r.ok) { const t = await r.text(); throw new Error('Claude ' + r.status + ': ' + t.slice(0, 200)); }
  const d = await r.json();
  return d.content.map(b => b.type === 'text' ? b.text : '').join('\n').trim();
}

// ── Stap 1: snelle relevantie-filter ─────────────────────────────────────────

async function quickFilter(mails) {
  const sys = `Je bent een analist die e-mails beoordeelt voor een interim-bureau (agile, projectmanagement, process management, business analyse). Antwoord uitsluitend met geldige JSON.`;
  const list = mails.map((m, i) =>
    `[${i}] ONDERWERP: ${m.subject} | VAN: ${m.from} | PREVIEW: ${m.body.slice(0, 200)}`
  ).join('\n');
  const usr = `Beoordeel welke e-mails een concrete interim-aanvraag zijn. Geef JSON:
{"results":[{"index":0,"relevant":true,"role_type":"agile|projectmanagement|process|business|overig","reden":"kort"}]}
Let op: nieuwsbrieven, marketing, auto-replies en vacatureoverzichten zijn NIET relevant.
MAILS:\n${list}`;
  const r = pj(await claude(sys, usr, Math.min(200 + mails.length * 80, 3000)));
  return r.results || [];
}

// ── Stap 2: volledige analyse van één mail ────────────────────────────────────

async function analyseMail(mail) {
  const sys = `Je bent een analist die interim-aanvragen verwerkt. Antwoord ALLEEN met geldige JSON.`;
  const usr = `Analyseer en geef JSON:
{"is_relevant":true,"role_type":"agile|projectmanagement|process|business|overig","functietitel":str,"opdrachtgever":str|null,"locatie":str|null,"remote":str|null,"startdatum":str|null,"duur":str|null,"uren_per_week":str|null,"tarief_max":str|null,"deadline":str|null,"eisen":[str],"wensen":[str],"gevraagde_documenten":[str],"cv_instructies":{"foto":"behouden|verwijderen|onbekend","naamvorm":"volledig|voornaam|achternaam|onbekend","geboortedatum":"toevoegen|weglaten|onbekend","motivatie_nodig":bool,"anonimiseren":bool},"samenvatting":str}
ONDERWERP: ${mail.subject}
VAN: ${mail.from}
TEKST:\n${mail.body}`;
  return pj(await claude(sys, usr, 1400));
}

// ── Deduplicatie ──────────────────────────────────────────────────────────────

function simScore(a, b) {
  const tok = s => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2));
  const A = tok(a), B = tok(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(w => { if (B.has(w)) n++; });
  return n / Math.min(A.size, B.size);
}

function detectDups(list) {
  const rel = list.filter(r => r.is_relevant && !r.duplicate_of);
  for (let i = 0; i < rel.length; i++) {
    for (let j = i + 1; j < rel.length; j++) {
      const a = rel[i], b = rel[j];
      if (b.duplicate_of) continue;
      if (simScore(`${a.functietitel} ${a.locatie} ${a.opdrachtgever}`, `${b.functietitel} ${b.locatie} ${b.opdrachtgever}`) > 0.45) {
        b.duplicate_of = a.id;
      }
    }
  }
}

// ── Matching ──────────────────────────────────────────────────────────────────

async function runMatching(req) {
  const sys = `Je bent een matching-specialist interim-bureau. Geef per kandidaat een eerlijke score 0-100. Knock-out eisen die ontbreken verlagen sterk. Antwoord ALLEEN geldige JSON.`;
  const cs = CANDIDATES.map(c =>
    `[${c.id}] ${c.naam} | rollen:${(c.rollen||[]).join(',')} | skills:${(c.skills||[]).join(',')} | sectoren:${(c.sectoren||[]).join(',')} | locatie:${c.locatie} reisbereid ${c.reisbereidheid}km | ${c.senioriteit} | €${c.tarief} | beschikbaar ${c.beschikbaar}`
  ).join('\n');
  const usr = `AANVRAAG: ${req.functietitel} (${req.role_type}) | ${req.locatie||'?'} | max €${req.tarief_max||'?'} | ${req.uren_per_week||'?'}u
Eisen: ${(req.eisen||[]).join(' | ')}
Wensen: ${(req.wensen||[]).join(' | ')}

KANDIDATEN:\n${cs}

Geef JSON:
{"matches":[{"candidate_id":"","score":0,"pro":[str],"risico":[str],"eisen_afgedekt":[str],"wensen_afgedekt":[str],"ontbreekt":[str]}]}
Sorteer aflopend score. Alleen score>=25.`;
  const r = pj(await claude(sys, usr, 2400));
  return (r.matches || [])
    .map(m => ({ ...m, candidate: CANDIDATES.find(c => c.id === m.candidate_id), decision: null }))
    .filter(m => m.candidate);
}

// ── Matching op Rol-niveau ────────────────────────────────────────────────────

async function runMatchingVoorRol(rol) {
  const sys = `Je bent een matching-specialist interim-bureau. Geef per professional een eerlijke score 0-100 op basis van de rolbeschrijving. Knock-out eisen die ontbreken verlagen de score sterk. Antwoord ALLEEN geldige JSON.`;
  const cs = CANDIDATES.map(c =>
    `[${c.id}] ${c.naam} | rollen:${(c.rollen||[]).join(',')} | skills:${(c.skills||[]).join(',')} | sectoren:${(c.sectoren||[]).join(',')} | locatie:${c.locatie||'?'} reisbereid ${c.reisbereidheid||60}km | €${c.tarief||'?'}/u | beschikbaar ${c.beschikbaar||'?'}${c.profiel ? ' | profiel: '+c.profiel.slice(0,200) : ''}`
  ).join('\n');
  const usr = `ROL: ${rol.functietitel}${rol.klant ? ' bij ' + rol.klant : ''} | locatie: ${rol.locatie||'?'} | ${rol.uren_per_week||'?'}u/week
${rol.omschrijving ? 'Omschrijving:\n' + rol.omschrijving.slice(0, 1500) : ''}

PROFESSIONALS:\n${cs}

Geef JSON:
{"matches":[{"candidate_id":"","score":0,"pro":["str"],"risico":["str"],"eisen_afgedekt":["str"],"ontbreekt":["str"]}]}
Sorteer aflopend op score. Neem alleen professionals op met score >= 25.`;
  const r = pj(await claude(sys, usr, 2400));
  return (r.matches || [])
    .map(m => ({ ...m, candidate: CANDIDATES.find(c => c.id === m.candidate_id) }))
    .filter(m => m.candidate);
}

// ── CV herschrijven ───────────────────────────────────────────────────────────

async function rewriteCV(req, cand) {
  const sys = `Je herschrijft de tekst van een kandidaat-CV toegespitst op een specifieke interim-aanvraag.

REGELS:
1. FUNCTIETITELS in werkervaring mag je hernoemen als de onderliggende taken en verantwoordelijkheden logisch passen bij de doelrol. Een Product Owner met taken als requirements ophalen en dashboardbeheer mag je "Business Analist" noemen als de aanvraag dat vraagt - en andersom. De werkgever, periode en feitelijke werkzaamheden blijven intact.
2. INTRO/KOPPROFIEL: verwijder of herschrijf zinnen die expliciet verwijzen naar een rol die niet past bij de aanvraag. Pas de intro aan zodat die aansluit bij de doelrol, op basis van wat er in het bron-CV staat.
3. TAKEN EN VERANTWOORDELIJKHEDEN per functie mag je herschrijven om de relevantie voor de doelrol te benadrukken, mits de inhoud feitelijk klopt met het origineel. Voeg geen taken toe die er niet waren.
4. OPLEIDING, CERTIFICATEN EN TALEN: deze pas je NOOIT aan. Neem ze exact over uit het bron-CV.
5. Verzin NOOIT feiten, werkgevers, periodes, certificaten of kwalificaties die er niet in staan.
6. Schrijf zakelijk en concreet. Verboden: bewezen staat van dienst, aantoonbare ervaring, gedegen kennis, passie voor, gedreven, hands-on, proactief, resultaatgericht, teamplayer, toegevoegde waarde, sparringpartner, breed inzetbaar.
7. Beschrijf alleen wat er WEL is. Noem niet wat ontbreekt.
8. Geen emoji, geen gedachtestreepjes.
9. Geef bij elk vervangingspaar ook de ORIGINELE tekst mee zodat de app die exact kan vinden en vervangen in het Word-document.
Antwoord ALLEEN geldige JSON.`;

  const cvBron = cand.cv_bron?.tekst
    ? 'BRON-CV TEKST (gebruik dit als basis voor de originele teksten):\n' + cand.cv_bron.tekst.slice(0, 6000)
    : '(geen bron-CV beschikbaar)';

  const usr = `AANVRAAG: ${req.functietitel} | ${req.opdrachtgever||''} | ${req.locatie||''}
Eisen: ${(req.eisen||[]).join(', ')}
Wensen: ${(req.wensen||[]).join(', ')}

KANDIDAATPROFIEL:
Naam: ${cand.naam} | ${cand.senioriteit} | beschikbaar ${cand.beschikbaar||'?'}
Huidig profiel: ${cand.profiel||''}
Skills: ${(cand.skills||[]).join(', ')}
Ervaring: ${JSON.stringify(cand.ervaring||[])}
Opleiding: ${JSON.stringify(cand.opleiding||[])}
${cvBron}

Geef JSON met de ORIGINELE tekst (exact zoals die in het CV staat) en de NIEUWE tekst:
{
  "naam_weergave": "str",
  "functietitel": "str (nieuwe hoofdfunctietitel bovenaan CV)",
  "oud_functietitel": "str (originele hoofdfunctietitel, exact uit CV)",
  "kopprofiel": "str (herschreven intro, rol-neutraal en passend bij aanvraag)",
  "oud_kopprofiel": "str (originele introtekst, exact uit CV)",
  "kernkwaliteiten": ["str (nieuw)"],
  "oud_kernkwaliteiten": ["str (origineel, exact)"],
  "skills": ["str"],
  "ervaring": [
    {
      "periode": "str (ongewijzigd)",
      "functie": "str (mag herschreven worden als inhoud past bij doelrol)",
      "oud_functie": "str (originele functietitel in deze functie, exact)",
      "org": "str (ongewijzigd)",
      "punten": ["str (herschreven voor doelrol)"],
      "oud_punten": ["str (origineel, exact)"]
    }
  ],
  "opleiding": [{"jaar":"str","titel":"str","org":"str"}],
  "toelichting_eisen": [{"eis":"str","hoe":"str"}],
  "signalen": ["str"]
}
Gebruik voor oud_* de tekst EXACT zoals die in het bron-CV staat zodat zoek-en-vervang werkt.
Opleiding, certificaten en talen: neem exact over, verander niets.`;

  return pj(await claude(sys, usr, 3200));
}

// ── Begeleidingsmail voor kanaal (op basis van rol, geen aanvraag nodig) ──────

async function genereerKanaalMailTekst(rol, cand) {
  const s = SETTINGS;
  const sys = `Je schrijft een zakelijke Nederlandse begeleidende e-mail waarmee een interim-kandidaat wordt voorgesteld aan een broker of opdrachtgever. Regels:
1. Kort en concreet — maximaal 3 alinea's.
2. VERBODEN: "bewezen staat van dienst", "aantoonbare ervaring", "gedegen kennis", "passie voor", "gedreven", "hands-on", "proactief", "resultaatgericht", "toegevoegde waarde", "sparringpartner", "enthousiast" en andere HR-clichés.
3. Noem alleen wat echt aanwezig is in het profiel.
4. Vermeld dat het CV als bijlage is toegevoegd.
5. Sluit af met de opgegeven ondertekening.
Antwoord ALLEEN geldige JSON.`;

  const usr = `STIJL: ${s.stijlinstructie||'Professioneel, concreet, kort.'}
AFZENDER: ${s.afzender_naam||'[naam]'}${s.afzender_functie?', '+s.afzender_functie:''}${s.bedrijf?', '+s.bedrijf:''}${s.afzender_telefoon?' · '+s.afzender_telefoon:''}
ONDERTEKENING: ${s.ondertekening||'Met vriendelijke groet,'}

ROL: ${rol.functietitel}${rol.klant?' bij '+rol.klant:''}${rol.locatie?' | '+rol.locatie:''}
${rol.omschrijving?'OMSCHRIJVING: '+rol.omschrijving.slice(0,400):''}

KANDIDAAT: ${cand.naam} | ${cand.senioriteit} | €${cand.tarief||'?'}/uur | beschikbaar ${cand.beschikbaar||'?'}
PROFIEL: ${cand.profiel||''}
ROLLEN: ${(cand.rollen||[]).join(', ')}
SKILLS: ${(cand.skills||[]).slice(0,8).join(', ')}

CV is als .docx bijgevoegd.
JSON: {"onderwerp":str,"body":str}`;

  return pj(await claude(sys, usr, 1000));
}

// ── Begeleidingsmail genereren ────────────────────────────────────────────────

async function generateMail(req, cand, match, cvData) {
  const sys = `Je schrijft een zakelijke Nederlandse begeleidende e-mail waarmee een interim-kandidaat wordt voorgesteld. Regels:
1. Kort en concreet - maximaal 3 alinea's. Geen uitsmijters of inleidende opsmuk.
2. VERBODEN woorden/zinnen: "bewezen staat van dienst", "aantoonbare ervaring", "gedegen kennis", "passie voor", "gedreven professional", "hands-on", "proactief", "resultaatgericht", "toegevoegde waarde", "sparringpartner", "breed inzetbaar", "enthousiast", "geen uitdaging te groot" en andere AI/HR-clichés.
3. Noem alleen wat echt aanwezig is - noem NIET wat de kandidaat niet heeft of wat niet gevraagd is.
4. Verwijs naar het bijgevoegde CV maar kopieer de inhoud niet in de mail.
5. Sluit af met de opgegeven ondertekening.
Antwoord ALLEEN geldige JSON.`;

  const s = SETTINGS;
  const usr = `STIJL: ${s.stijlinstructie||'Professioneel, concreet, kort.'}
AFZENDER: ${s.afzender_naam||'[naam]'}${s.afzender_functie?', '+s.afzender_functie:''}${s.bedrijf?', '+s.bedrijf:''}${s.afzender_telefoon?' · '+s.afzender_telefoon:''}
ONDERTEKENING: ${s.ondertekening||'Met vriendelijke groet,'}
AAN: ${req.van} (afzender originele aanvraag)

AANVRAAG: ${req.functietitel} | ${req.opdrachtgever||''} | ${req.locatie||''}
Gevraagd: ${(req.gevraagde_documenten||[]).join(', ')||'CV'}
Eisen: ${(req.eisen||[]).slice(0,5).join(' | ')}

KANDIDAAT: ${cvData.naam_weergave||cand.naam} | €${cand.tarief} | beschikbaar ${cand.beschikbaar}
Profiel: ${cvData.kopprofiel||cand.profiel||''}
Afgedekte eisen: ${(match.eisen_afgedekt||[]).join(' | ')}

CV gaat als PDF-bijlage mee. Verwijs ernaar maar kopieer de inhoud niet in de mail.
JSON: {"onderwerp":str,"body":str}`;

  return pj(await claude(sys, usr, 1200));
}

// ── PDF maken ─────────────────────────────────────────────────────────────────

function makePDF(cvData, cand, req) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), M = 48; let y = 64;
  const moss = [47,71,51], ink = [22,32,28], soft = [92,107,120];
  const nl = (c = [207,199,180]) => { doc.setDrawColor(...c); doc.setLineWidth(.7); doc.line(M, y, W-M, y); y += 14; };
  const tx = (t, sz, col, st = 'normal', lh = 14, x = M, mw = W-2*M) => {
    if (!t) return;
    doc.setFont('helvetica', st); doc.setFontSize(sz); doc.setTextColor(...col);
    doc.splitTextToSize(String(t), mw).forEach(l => { if (y > 780) { doc.addPage(); y = 64; } doc.text(l, x, y); y += lh; });
  };
  const hd = t => { y += 6; tx(t.toUpperCase(), 10, moss, 'bold', 13); y += 2; nl(); };

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...ink);
  if (y > 780) { doc.addPage(); y = 64; }
  doc.text(cvData.naam_weergave || cand.naam, M, y); y += 8;
  tx(`${cand.senioriteit} - ${cvData.functietitel||req.functietitel||""}`, 11, soft, 'normal', 15); y += 4;
  if (SETTINGS.bedrijf) { doc.setFontSize(9); doc.setTextColor(...moss); doc.text(`Voorgesteld door ${SETTINGS.bedrijf}`, M, y); y += 10; }
  nl(moss);

  hd('Profiel'); tx(cvData.kopprofiel || cand.profiel || '', 10.5, ink, 'normal', 15); y += 4;
  if (cvData.kernkwaliteiten?.length) {
    hd('Kernkwaliteiten');
    cvData.kernkwaliteiten.forEach(k => {
      if (y > 770) { doc.addPage(); y = 64; }
      doc.setFillColor(...moss); doc.circle(M+2, y-3, 1.6, 'F');
      tx(k, 10.5, ink, 'normal', 14, M+12, W-2*M-12);
    });
    y += 4;
  }
  if (cvData.skills?.length) { hd('Vaardigheden'); tx(cvData.skills.join(' · '), 10.5, ink, 'normal', 15); y += 4; }
  if (cvData.ervaring?.length) {
    hd('Werkervaring');
    cvData.ervaring.forEach(e => {
      if (y > 740) { doc.addPage(); y = 64; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); doc.text(e.functie||'', M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...soft); doc.text(e.periode||'', W-M, y, { align: 'right' }); y += 14;
      tx(e.org||'', 10, soft, 'italic', 13); y += 1;
      (e.punten||[]).forEach(p => {
        if (y > 770) { doc.addPage(); y = 64; }
        doc.setFillColor(...soft); doc.circle(M+2, y-3, 1.4, 'F');
        tx(p, 10, ink, 'normal', 13.5, M+12, W-2*M-12);
      });
      y += 7;
    });
  }
  if (cvData.toelichting_eisen?.length) {
    hd('Toelichting op eisen');
    cvData.toelichting_eisen.forEach(t => {
      if (y > 760) { doc.addPage(); y = 64; }
      tx('• ' + t.eis, 10, moss, 'bold', 13.5);
      tx(t.hoe, 10, ink, 'normal', 13.5, M+12, W-2*M-12); y += 3;
    });
  }
  if (cvData.opleiding?.length) {
    hd('Opleiding');
    cvData.opleiding.forEach(o => {
      if (y > 775) { doc.addPage(); y = 64; }
      tx(`${o.jaar} - ${o.titel}, ${o.org}`, 10.5, ink, 'normal', 14);
    });
  }
  return doc;
}

// ── Batch analyse pipeline ────────────────────────────────────────────────────

async function startBatchAnalyse() {
  const toProcess = PENDING_MAILS.filter(m => !m._skip);
  if (!toProcess.length) { toast('Geen mails geselecteerd.'); return; }
  if (!claudeKey()) { toast('Vul je Claude API-sleutel in (links in de sidebar).'); return; }
  const btn = document.getElementById('btnAnalyse');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span> Filteren (${toProcess.length} mails)…`; }
  try {
    toast('Stap 1/2 - snel filteren op relevantie…', true);
    const filterResults = await quickFilter(toProcess);
    const relevante  = toProcess.filter((_, i) => { const fr = filterResults.find(r => r.index === i); return fr && fr.relevant; });
    const irrelevante = toProcess.filter((_, i) => { const fr = filterResults.find(r => r.index === i); return !fr || !fr.relevant; });

    for (const m of irrelevante) {
      const fr = filterResults.find(r => r.index === toProcess.indexOf(m));
      const rec = {
        id: 'r_' + m.id, mail_id: m.id, van: m.from, ontvangen: m.received,
        onderwerp: m.subject, body: m.body, is_relevant: false, role_type: 'overig',
        functietitel: m.subject, samenvatting: fr?.reden || 'Niet relevant',
        status: 'afgewezen', eisen: [], wensen: [], gevraagde_documenten: []
      };
      await DB.upsertAanvraag(rec);
    }

    let done = 0;
    const newReqs = [];
    for (const m of relevante) {
      toast(`Stap 2/2 - analyseren ${++done}/${relevante.length}…`, true);
      try {
        const a = await analyseMail(m);
        const rec = { id: 'r_' + m.id, mail_id: m.id, van: m.from, ontvangen: m.received, onderwerp: m.subject, body: m.body, ...a, status: 'geanalyseerd', duplicate_of: null, matches: null };
        newReqs.push(rec);
        await DB.upsertAanvraag(rec);
      } catch(e) { toast('Analyse mislukt voor: ' + m.subject); }
    }

    detectDups([...AANVRAGEN, ...newReqs]);
    for (const r of newReqs.filter(r => r.duplicate_of)) await DB.upsertAanvraag(r);

    AANVRAGEN = await DB.getAanvragen();
    PENDING_MAILS = PENDING_MAILS.filter(m => m._skip);
    toast(`Klaar: ${relevante.length} relevant, ${irrelevante.length} niet-relevant.`);
    setView('rollen');
  } catch(err) {
    toast('Fout: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Opnieuw proberen'; }
  }
}

// ── CV versie helpers ─────────────────────────────────────────────────────────

function herstelRawBlob(cand) {
  // rawBlob wordt asynchroon geladen vanuit storage - no-op, backwards compat
}

async function getBesteCVVersie(cand, req) {
  const rolMap = {
    agile: 'Scrum Master',
    projectmanagement: 'IT Projectmanager',
    process: 'Business Analist / Process Manager',
    business: 'Business Analist / Process Manager',
    overig: null
  };
  const doelRol = rolMap[req.role_type] || null;
  if (doelRol) {
    const blob = await DB.getRolCVBlob(cand.id, doelRol);
    if (blob) return { blob, roltype: doelRol };
  }
  if (cand.cv_bron?.rawBlob) return { blob: cand.cv_bron.rawBlob, roltype: 'bron' };
  if (cand.cv_bron?.opgeslagen) {
    const ok = await laadRawBlob(cand);
    if (ok && cand.cv_bron.rawBlob) return { blob: cand.cv_bron.rawBlob, roltype: 'bron' };
  }
  return null;
}

async function laadRawBlob(cand) {
  if (cand.cv_bron?.rawBlob) return true;
  if (!cand.cv_bron?.opgeslagen) return false;
  try {
    const blob = await DB.getBronCVBlob(cand.id);
    if (!blob) return false;
    cand.cv_bron.rawBlob = blob;
    return true;
  } catch(e) {
    console.warn('rawBlob laden mislukt voor ' + cand.naam + ':', e.message);
    return false;
  }
}

// ── CV review: analyseer en stel minimale wijzigingen voor ───────────────────

async function analyseerCVVoorRol(cand, rolBeschrijving, cvTekst) {
  const sys = `Je bent een CV-specialist voor interim-professionals. Stel MINIMALE aanpassingen voor aan een CV.

Strikte regels:
- Verzin NOOIT nieuwe ervaringen, vaardigheden, certificaten of prestaties
- "oud" velden: KOPIEER de tekst LETTERLIJK uit de CV tekst — dit wordt gebruikt voor zoek-en-vervang
- Functietitel (bovenaan): alleen de hoofdtitel direct onder de naam
- Profielschets "oud": alleen de EERSTE ZIN letterlijk gekopieerd
- Werkervaringstitel: de vette/header functietitels in ervaringsblokken aanpassen:
    * Vergelijkbaar met doelrol → gebruik de exacte doelrol titel
    * Gerelateerd maar niet hetzelfde → gebruik een generieke term (bijv. "Business Consultant", "Project Professional", "IT Consultant", "Management Consultant")
    * Duidelijk anders → sla over
- Beschrijving functietitels: vermeldingen van een functietitel BINNEN de beschrijvingstekst van een ervaringsblok (bijv. "Als Business Analist heb ik…" of "in mijn rol als Senior Adviseur…"). Zelfde logica als werkervaringstitel. Kopieer de exacte zin of woordgroep letterlijk als "oud".
- Bullets: maximaal 3, alleen herformuleren — geen nieuwe feiten
- Geef null als een sectie geen aanpassing nodig heeft
- Antwoord UITSLUITEND met geldige JSON`;

  const usr = `KANDIDAAT: ${cand.naam} | ${cand.senioriteit}
ROLLEN: ${(cand.rollen || []).join(', ')}
PROFIEL: ${cand.profiel || ''}

ROL WAARVOOR WE VOORSTELLEN:
${rolBeschrijving}

CV TEKST:
${cvTekst.slice(0, 4500)}

Geef JSON:
{
  "functietitel": { "oud": "exacte hoofdtitel bovenaan CV", "nieuw": "nieuwe titel" },
  "profielschets": { "oud": "exacte eerste zin huidig profiel", "nieuw": "nieuwe profielschets max 4 zinnen" },
  "werkervaringstitel": [
    { "oud": "exacte functietitel uit ervaringsblok header", "nieuw": "aangepaste titel" }
  ],
  "beschrijving_titels": [
    { "oud": "exacte woordgroep of zin met functietitel uit beschrijvingstekst", "nieuw": "aangepaste versie" }
  ],
  "bullets": [{ "oud": "exacte zin uit CV", "nieuw": "herformulering" }]
}

Gebruik null voor functietitel of profielschets als geen aanpassing nodig. Lege arrays [] als geen aanpassingen.`;

  const raw = await claude(sys, usr, 1500);
  return pj(raw);
}

// ── Gerichte tekstvervanging in .docx via JSZip ───────────────────────────────

// Strategie 2: paragraaf-niveau — werkt als tekst verspreid is over meerdere runs
function vervangInParagraaf(xml, oudeT, nieuweT) {
  const xmlEscNieuw = nieuweT
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let gevonden = false;

  const nieuweXml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    // Haal alle tekst op uit de paragraaf (over alle runs heen)
    const tekst = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map(m => m[1]).join('');

    if (!gevonden && tekst.includes(oudeT)) {
      gevonden = true;
      // Zet nieuwe tekst in eerste <w:t>, maak de rest leeg
      let isEerste = true;
      return para.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs) => {
        if (isEerste) { isEerste = false; return `<w:t${attrs}>${xmlEscNieuw}</w:t>`; }
        return `<w:t${attrs}></w:t>`;
      });
    }
    return para;
  });

  return { xml: nieuweXml, gevonden };
}

async function vervangTekstInDocx(blob, vervangingen) {
  const zip = await JSZip.loadAsync(blob);
  const xmlFile = zip.files['word/document.xml'];
  if (!xmlFile) throw new Error('Geen geldig .docx bestand');

  let xml = await xmlFile.async('string');
  const resultaten = [];

  for (const { oud, nieuw } of vervangingen) {
    if (!oud || !nieuw || oud === nieuw) continue;

    const xmlEscOud = oud.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const xmlEscNieuw = nieuw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Strategie 1: directe vervanging (tekst in één run)
    if (xml.includes(xmlEscOud)) {
      xml = xml.split(xmlEscOud).join(xmlEscNieuw);
      resultaten.push({ tekst: oud.slice(0, 40), status: 'vervangen' });
      continue;
    }

    // Strategie 2: paragraaf-niveau (tekst verspreid over meerdere runs)
    const { xml: xmlNieuw, gevonden } = vervangInParagraaf(xml, oud, nieuw);
    if (gevonden) {
      xml = xmlNieuw;
      resultaten.push({ tekst: oud.slice(0, 40), status: 'vervangen' });
    } else {
      resultaten.push({ tekst: oud.slice(0, 40), status: 'niet_gevonden' });
    }
  }

  zip.file('word/document.xml', xml);
  const nieuweBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  return { blob: nieuweBlob, resultaten };
}
