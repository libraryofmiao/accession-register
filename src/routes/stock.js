// Scalable Current Stock routes.
// Integration: mount with app.use('/api/admin/stock', requireStaff, createStockRouter(supabaseAdmin)).
import express from 'express';

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;
const ALLOWED_STATUSES = new Set(['Available', 'Issued', 'Missing', 'Lost', 'Damaged', 'Withdrawn']);

export function createStockRouter(supabaseAdmin) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(String(req.query.page_size || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
      const search = String(req.query.search || '').trim();
      const source = String(req.query.source || '').trim();
      const rrrlfScheme = String(req.query.rrrlf_scheme || '').trim();
      const status = String(req.query.status || '').trim();
      const offset = (page - 1) * pageSize;
      const end = offset + pageSize - 1;

      let query = supabaseAdmin
        .from('accessions')
        .select('id,accession_no,title,ddc_number,subject,status,source,rrrlf_scheme,location_id,location_master(location_code,location_name,shelf)', { count: 'exact' })
        .order('accession_no', { ascending: true })
        .range(offset, end);

      if (search) {
        const p = `%${search}%`;
        query = query.or(`accession_no.ilike.${p},title.ilike.${p},ddc_number.ilike.${p},subject.ilike.${p}`);
      }
      if (source) query = query.eq('source', source);
      if (rrrlfScheme) query = query.eq('rrrlf_scheme', rrrlfScheme);
      if (status && ALLOWED_STATUSES.has(status)) query = query.eq('status', status);

      const { data, error, count } = await query;
      if (error) return res.status(500).json({ error: error.message });

      res.json({
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
        rows: data || []
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load stock.' });
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const source = String(req.query.source || '').trim();
      const rrrlfScheme = String(req.query.rrrlf_scheme || '').trim();

      const statuses = ['Available', 'Issued', 'Missing', 'Lost', 'Damaged', 'Withdrawn'];
      const summary = { total: 0, Available: 0, Issued: 0, Missing: 0, Lost: 0, Damaged: 0, Withdrawn: 0 };

      for (const status of statuses) {
        let query = supabaseAdmin.from('accessions').select('id', { count: 'exact', head: true }).eq('status', status);
        if (source) query = query.eq('source', source);
        if (rrrlfScheme) query = query.eq('rrrlf_scheme', rrrlfScheme);
        const { count, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        summary[status] = count || 0;
      }

      let totalQuery = supabaseAdmin.from('accessions').select('id', { count: 'exact', head: true });
      if (source) totalQuery = totalQuery.eq('source', source);
      if (rrrlfScheme) totalQuery = totalQuery.eq('rrrlf_scheme', rrrlfScheme);
      const { count: total, error: totalError } = await totalQuery;
      if (totalError) return res.status(500).json({ error: totalError.message });
      summary.total = total || 0;

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to calculate stock summary.' });
    }
  });

  return router;
}
