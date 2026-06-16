'use strict';

// ── Supabase connection ──────────────────────────────────────────────────────
// The anon key is public by design — Supabase RLS policies protect your data.
const SB_URL = 'https://rpwmffdvbcfcbbkkfaem.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd21mZmR2YmNmY2Jia2tmYWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjM5MjMsImV4cCI6MjA5Njc5OTkyM30.6JtWoNCFkZV36xE8OgD3I7o8uo0bIeuicCEzqKsaU-U';

// ── Domain constants ─────────────────────────────────────────────────────────
const ROLE_LABELS = {
  agile: 'Agile',
  projectmanagement: 'Projectmanagement',
  process: 'Process management',
  business: 'Business analyse',
  overig: 'Overig'
};

const ROL_KOLOMMEN = [
  'Scrum Master',
  'Product Owner',
  'IT Projectmanager',
  'Business Analist / Process Manager'
];

const MAAND_NAMEN = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
