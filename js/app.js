// ── Window wrappers for inline onclick in generated HTML ──────────────────────
// These must be on window so onclick="..." in innerHTML can reach them

window._openRol           = id  => openRolDrawer(id);
window._verwijderRol      = id  => verwijderRol(id);
window._verwijderKanaal   = id  => verwijderKanaal(id);
window._updateKanaal      = (id, veld, val) => updateKanaal(id, veld, val);
window._genereerKanaalCV  = id  => genereerKanaalCV(id);
window._genereerKanaalMail= id  => genereerKanaalMail(id);
window._checkDup          = id  => checkDuplicaatRollen(id);
window._samenvoeg         = (id1, id2) => samenvoegRollen(id1, id2);

// ── Event wiring ──────────────────────────────────────────────────────────────

// Nav clicks (main nav buttons with data-v)
document.getElementById('nav').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b?.dataset.v) setView(b.dataset.v);
});

// Aside clicks (Instellingen button is outside nav)
document.querySelector('aside').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]');
  if (b && b.dataset.v && !document.getElementById('nav').contains(b)) setView(b.dataset.v);
});

// Drawer close
document.getElementById('dClose').onclick = closeDrawer;
document.getElementById('overlay').onclick = closeDrawer;

// Restore Claude key from localStorage
try {
  const k = localStorage.getItem('claude_key');
  if (k) document.getElementById('claudeKey').value = k;
} catch(e) {}
document.getElementById('claudeKey').addEventListener('change', function() {
  try { localStorage.setItem('claude_key', this.value); } catch(e) {}
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const dot = document.getElementById('dbDot'), status = document.getElementById('dbStatus');
  dot.className = 'conn-dot loading';
  status.textContent = 'Verbinden met Supabase…';

  // Render app immediately — don't wait for DB
  setView('vandaag');

  const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout na ' + ms / 1000 + 's')), ms));
  try {
    const ok = await Promise.race([DB.checkConn(), timeout(8000)]);
    if (ok) { dot.className = 'conn-dot ok'; status.textContent = 'Supabase verbonden'; }
    else { dot.className = 'conn-dot err'; status.textContent = 'Verbinding mislukt - controleer Supabase'; return; }
  } catch(e) {
    dot.className = 'conn-dot err';
    status.textContent = 'Fout: ' + e.message;
    toast('Supabase niet bereikbaar: ' + e.message);
    return;
  }

  try {
    [CANDIDATES, AANVRAGEN, CONCEPTEN, SETTINGS, TEAMLEDEN, KALENDER, ROLLEN, KANALEN] = await Promise.all([
      DB.getKandidaten(),
      DB.getAanvragen(),
      DB.getConcepten(),
      DB.getInstellingen(),
      DB.getTeamleden().catch(() => []),
      DB.getKalender().catch(() => []),
      DB.getRollen().catch(() => []),
      DB.getKanalen().catch(() => [])
    ]);
    CANDIDATES.forEach(herstelRawBlob);

    // Seed sample candidates if DB is empty
    if (!CANDIDATES.length) {
      const seeds = [
        {
          id: 'c1', naam: 'Sanne de Vries', email: 'sanne@example.nl',
          beschikbaar: '2026-06-15', tarief: 92,
          rollen: ['Business Analist', 'Data Analist'],
          skills: ['Power BI', 'SQL', 'Visio', 'Google Analytics', 'HR-analytics'],
          sectoren: ['Rijksoverheid', 'Zorg'], locatie: 'Utrecht', reisbereidheid: 60,
          senioriteit: 'Senior',
          profiel: 'Business/data analist met focus op dashboarding en procesvisualisatie in de publieke sector.',
          ervaring: [
            { periode: '2021-heden', functie: 'Senior Business Analist', org: 'Uitvoeringsorganisatie', punten: ['Power BI dashboards voor HR en recruitment', 'Procesplaten in Visio', 'Google Analytics analyse'] },
            { periode: '2018-2021', functie: 'Data Analist', org: 'Gemeente', punten: ['Stuurinformatie dashboards', 'Webstatistieken analyse'] }
          ],
          opleiding: [{ jaar: '2016', titel: 'MSc Methodologie & Statistiek', org: 'Universiteit Utrecht' }],
          motivatie: ['8 jaar Power BI in overheidscontext', 'HR/recruitment dashboards gebouwd'],
          opmerkingen: 'Voorkeur Midden-Nederland.', cv_bron: null
        },
        {
          id: 'c2', naam: 'Mark Jansen', email: 'mark@example.nl',
          beschikbaar: '2026-07-01', tarief: 88,
          rollen: ['Data Analist', 'BI Consultant'],
          skills: ['Power BI', 'Python', 'SQL', 'Google Analytics', 'Tableau'],
          sectoren: ['Marketing', 'Retail'], locatie: 'Amersfoort', reisbereidheid: 45,
          senioriteit: 'Medior',
          profiel: 'Data-analist met nadruk op web- en marketinganalytics.',
          ervaring: [{ periode: '2020-heden', functie: 'Data Analist', org: 'Retailketen', punten: ['Marketing dashboards', 'Google Analytics implementatie'] }],
          opleiding: [{ jaar: '2017', titel: 'BSc Bedrijfskunde', org: 'Hogeschool' }],
          motivatie: ['Sterk in webstatistiek', 'Marketing data analyse'],
          opmerkingen: 'Geen overheidservaring.', cv_bron: null
        },
        {
          id: 'c3', naam: 'Imran El Amrani', email: 'imran@example.nl',
          beschikbaar: '2026-06-16', tarief: 97,
          rollen: ['Scrum Master', 'Agile Coach'],
          skills: ['Scrum', 'SAFe', 'Kanban', 'Agile transformatie', 'Coaching'],
          sectoren: ['Bankwezen', 'Verzekeringen'], locatie: 'Rotterdam', reisbereidheid: 50,
          senioriteit: 'Senior',
          profiel: 'Scrum Master en Agile Coach met ruime ervaring in financiële transformaties.',
          ervaring: [{ periode: '2019-heden', functie: 'Agile Coach', org: 'Grootbank', punten: ['SAFe-implementatie begeleid', 'Teams gecoacht bij transformatie'] }],
          opleiding: [{ jaar: '2015', titel: 'PSM II', org: 'Scrum.org' }],
          motivatie: ['7 jaar Scrum Master bankwezen', 'PSM II gecertificeerd', 'SAFe ervaring'],
          opmerkingen: 'Hybride, Randstad.', cv_bron: null
        },
        {
          id: 'c4', naam: 'Petra Bakker', email: 'petra@example.nl',
          beschikbaar: '2026-08-01', tarief: 105,
          rollen: ['Projectmanager', 'Programmamanager'],
          skills: ['Prince2', 'Stakeholdermanagement', 'Planning', 'MS Project'],
          sectoren: ['Rijksoverheid'], locatie: 'Den Haag', reisbereidheid: 40,
          senioriteit: 'Senior',
          profiel: 'Ervaren projectmanager binnen de publieke sector.',
          ervaring: [{ periode: '2018-heden', functie: 'Projectmanager', org: 'Rijksoverheid', punten: ['ICT-projecten geleid', 'Stakeholdermanagement'] }],
          opleiding: [{ jaar: '2010', titel: 'Prince2 Practitioner', org: 'Axelos' }],
          motivatie: ['Prince2 Practitioner', 'Rijksoverheid ICT-projecten'],
          opmerkingen: 'Beschikbaar augustus.', cv_bron: null
        }
      ];
      for (const s of seeds) await DB.upsertKandidaat(s);
      CANDIDATES = await DB.getKandidaten();
      CANDIDATES.forEach(herstelRawBlob);
    }
  } catch(e) { toast('Data laden mislukt: ' + e.message); }

  renderView();
  updateBadges();
}

init();
