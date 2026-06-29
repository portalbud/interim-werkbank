// ── Supabase client ──────────────────────────────────────────────────────────
let sb;
try {
  sb = supabase.createClient(SB_URL, SB_KEY);
} catch(e) {
  console.error('Supabase init fout:', e);
  document.getElementById('dbStatus').textContent = 'Library laad-fout: ' + e.message;
}

// ── DB layer — all Supabase calls go here ────────────────────────────────────
const DB = {
  async checkConn() {
    const { error } = await sb.from('instellingen').select('id').limit(1);
    return !error;
  },

  // kandidaten
  async getKandidaten() {
    const { data } = await sb.from('kandidaten').select('*').order('naam');
    return data || [];
  },
  async upsertKandidaat(c) {
    const { error } = await sb.from('kandidaten').upsert(c, { onConflict: 'id' });
    if (error) throw error;
  },
  async deleteKandidaat(id) {
    await sb.from('concepten').delete().eq('kandidaat_id', id);
    await sb.from('cv_versies').delete().eq('kandidaat_id', id);
    const { error } = await sb.from('kandidaten').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // aanvragen
  async getAanvragen() {
    const { data } = await sb.from('aanvragen').select('*').order('ontvangen', { ascending: false });
    return data || [];
  },
  async upsertAanvraag(r) {
    const { error } = await sb.from('aanvragen').upsert(r, { onConflict: 'id' });
    if (error) throw error;
  },
  async deleteAanvraag(id) { await sb.from('aanvragen').delete().eq('id', id); },
  async deleteConcept(id)  { await sb.from('concepten').delete().eq('id', id); },

  // cv versies
  async getCVVersies(kandidaatId) {
    const { data } = await sb.from('cv_versies').select('*').eq('kandidaat_id', kandidaatId).order('versie');
    return data || [];
  },
  async saveCVVersie(v) {
    const { data, error } = await sb.from('cv_versies').insert(v).select().single();
    if (error) throw error;
    return data;
  },
  async getNextCVVersie(kandidaatId) {
    const { count } = await sb.from('cv_versies').select('*', { count: 'exact', head: true }).eq('kandidaat_id', kandidaatId);
    return (count || 0) + 1;
  },

  // cv bestanden via storage
  async uploadDocx(kandidaatId, versie, blob) {
    const path = kandidaatId + '/v' + versie + '.docx';
    const { error } = await sb.storage.from('cv-bestanden').upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    if (error) throw error;
    const { data, error: e2 } = await sb.storage.from('cv-bestanden').createSignedUrl(path, 31536000);
    if (e2 || !data) throw new Error('Signed URL mislukt: ' + (e2 && e2.message || 'onbekend'));
    return data.signedUrl;
  },
  async getDocxUrl(kandidaatId, versie) {
    const path = kandidaatId + '/v' + versie + '.docx';
    const { data, error } = await sb.storage.from('cv-bestanden').createSignedUrl(path, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  },

  // bron-CV opslaan/ophalen
  async uploadBronCV(kandidaatId, blob) {
    const path = 'bronCV/' + kandidaatId + '.docx';
    const { error } = await sb.storage.from('cv-bestanden').upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    if (error) throw error;
    return path;
  },
  async getBronCVBlob(kandidaatId) {
    const path = 'bronCV/' + kandidaatId + '.docx';
    const { data, error } = await sb.storage.from('cv-bestanden').download(path);
    if (error || !data) return null;
    return data; // Blob
  },

  // concepten
  async getConcepten() {
    const { data } = await sb.from('concepten').select('*').order('aangemaakt_op', { ascending: false });
    return data || [];
  },
  async saveConceptt(c) {
    const { error } = await sb.from('concepten').insert(c);
    if (error) throw error;
  },

  // instellingen
  async getInstellingen() {
    const { data } = await sb.from('instellingen').select('*').eq('id', 1).single();
    return data || {};
  },
  async saveInstellingen(s) {
    const { error } = await sb.from('instellingen').upsert({ ...s, id: 1, bijgewerkt_op: new Date().toISOString() });
    if (error) throw error;
  },

  // rollen
  async getRollen() {
    const { data } = await sb.from('rollen').select('*').order('aangemaakt_op', { ascending: false });
    return data || [];
  },
  async upsertRol(r) {
    const { data, error } = await sb.from('rollen').upsert(r, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  },
  async deleteRol(id) {
    await sb.from('kanalen').delete().eq('rol_id', id);
    await sb.from('rollen').delete().eq('id', id);
  },

  // kanalen
  async getKanalen() {
    const { data } = await sb.from('kanalen').select('*').order('aangemaakt_op', { ascending: false });
    return data || [];
  },
  async upsertKanaal(k) {
    if (k.kandidaat_id && typeof CANDIDATES !== 'undefined') {
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      if (cand) k.kandidaat_naam = cand.naam;
    }
    if (!k.kandidaat_id) k.kandidaat_naam = null;
    if (k.id) {
      const { id: kid, ...updateRec } = k;
      const { data, error } = await sb.from('kanalen').update(updateRec).eq('id', kid).select().single();
      if (error) throw error;
      return data;
    } else {
      const { id: _, ...rec } = k;
      const { data, error } = await sb.from('kanalen').insert(rec).select().single();
      if (error) throw error;
      return data;
    }
  },
  async insertKanaal(k) {
    if (k.kandidaat_id && typeof CANDIDATES !== 'undefined') {
      const cand = CANDIDATES.find(c => c.id === k.kandidaat_id);
      if (cand) k.kandidaat_naam = cand.naam;
    }
    const { id: _, ...rec } = k;
    const { data, error } = await sb.from('kanalen').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async deleteKanaal(id) { await sb.from('kanalen').delete().eq('id', id); },

  // kalender
  async getKalender() {
    const { data } = await sb.from('kalender').select('*');
    return data || [];
  },
  async upsertKalender(entry) {
    const { error } = await sb.from('kalender').upsert(entry, { onConflict: 'kandidaat_id,maand,jaar,rol' });
    if (error) throw error;
  },
  async deleteKalender(id) { await sb.from('kalender').delete().eq('id', id); },
  async deleteKalenderVoorKandidaat(kandidaatId) {
    await sb.from('kalender').delete().eq('kandidaat_id', kandidaatId);
  },

  // teamleden
  async getTeamleden() {
    const { data } = await sb.from('teamleden').select('*').order('naam');
    return data || [];
  },
  async upsertTeamlid(t) {
    const { error } = await sb.from('teamleden').upsert(t, { onConflict: 'naam' });
    if (error) throw error;
  },
  async deleteTeamlid(id) { await sb.from('teamleden').delete().eq('id', id); },

  // cv-versies per rol
  async getCVVersiesVanKandidaat(kandidaatId) {
    const { data } = await sb.from('cv_versies').select('*').eq('kandidaat_id', kandidaatId).order('roltype');
    return data || [];
  },
  async uploadRolCV(kandidaatId, roltype, versieNaam, blob) {
    const path = 'rolcv/' + kandidaatId + '/' + roltype.replace(/\s+/g, '_') + '.docx';
    const { error } = await sb.storage.from('cv-bestanden').upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    if (error) throw error;
    const { data, error: e2 } = await sb.storage.from('cv-bestanden').createSignedUrl(path, 31536000);
    if (e2 || !data) throw new Error('Signed URL mislukt');
    return { path, url: data.signedUrl };
  },
  async getRolCVBlob(kandidaatId, roltype) {
    const path = 'rolcv/' + kandidaatId + '/' + roltype.replace(/\s+/g, '_') + '.docx';
    const { data, error } = await sb.storage.from('cv-bestanden').download(path);
    if (error || !data) return null;
    return data; // Blob
  },

  // aanbiedingsdocument template per rol
  async uploadAanbiedingTemplate(rolId, blob) {
    const path = 'aanbiedingen/' + rolId + '/template.docx';
    const { error } = await sb.storage.from('cv-bestanden').upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    if (error) throw error;
  },
  async heeftAanbiedingTemplate(rolId) {
    const { data } = await sb.storage.from('cv-bestanden').list('aanbiedingen/' + rolId);
    return !!(data && data.length);
  },
  async downloadAanbiedingTemplate(rolId) {
    const { data, error } = await sb.storage.from('cv-bestanden').download('aanbiedingen/' + rolId + '/template.docx');
    if (error || !data) return null;
    return data;
  }
};
