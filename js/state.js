// ── Global application state ─────────────────────────────────────────────────
// All mutable state lives here so every module can read/write it freely.

let CANDIDATES  = [];
let AANVRAGEN   = [];
let CONCEPTEN   = [];
let SETTINGS    = {};
let TEAMLEDEN   = [];
let KALENDER    = [];
let ROLLEN      = [];
let KANALEN     = [];
let PENDING_MAILS = [];

let activeView = 'vandaag';

// ── Portal Buddy state ───────────────────────────────────────────────────────
let PB = {
  aanvraagTekst: '',
  parsed: null,
  matches: [],
  geselecteerd: [],
  resultaten: {},
  docFile: null,
  docFilename: '',
  reqId: null
};

// ── Batch CV upload state ────────────────────────────────────────────────────
let BATCH = {
  bestanden: [],
  actief: false
};

// ── Dag verwerking state ─────────────────────────────────────────────────────
let DAG = {
  fase: 'idle',
  voortgang: 0,
  totaal: 0,
  log: [],
  wachtrij: []
};

// ── Kalender drag state ──────────────────────────────────────────────────────
let KAL_DRAG = null;
