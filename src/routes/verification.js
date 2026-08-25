import express from 'express';

const RESULTS = new Set(['Found', 'Missing', 'Damaged', 'Wrong Location', 'Not Verified']);

export function createVerificationRouter(supabaseAdmin) {
  const router = express.Router();

  router.post('/sessions', async (req, res) => {
    try {
      const { section = null, rack = null, shelf = null, notes = null, created_by = null } = req.body || {};
      const { data, error } = await supabaseAdmin
        .from('verification_sessions')
        .insert({ section, rack, shelf, notes, created_by })
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to start verification.' });
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('verification_sessions')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load verification sessions.' });
    }
  });

  router.get('/sessions/:sessionId/items', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('verification_items')
        .select('id,session_id,accession_id,result,found_location_id,verified_at,verified_by,notes,accessions(accession_no,title,status,location_id),location_master(location_code,location_name,shelf)')
        .eq('session_id', req.params.sessionId)
        .order('verified_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load verification items.' });
    }
  });

  router.post('/sessions/:sessionId/items', async (req, res) => {
    try {
      const { accession_id, result, found_location_id = null, verified_by = null, notes = null } = req.body || {};
      if (!accession_id || !RESULTS.has(result)) return res.status(400).json({ error: 'Accession and a valid verification result are required.' });
      const { data, error } = await supabaseAdmin
        .from('verification_items')
        .upsert({ session_id: req.params.sessionId, accession_id, result, found_location_id, verified_by, notes, verified_at: new Date().toISOString() }, { onConflict: 'session_id,accession_id' })
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save verification result.' });
    }
  });

  router.post('/sessions/:sessionId/complete', async (req, res) => {
    try {
      const { completed_by = null } = req.body || {};
      const { data, error } = await supabaseAdmin
        .from('verification_sessions')
        .update({ status: 'Completed', completed_at: new Date().toISOString(), completed_by })
        .eq('id', req.params.sessionId)
        .eq('status', 'In Progress')
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to complete verification.' });
    }
  });

  return router;
}
