import { Router } from 'express';
import { EvidenceDemo } from '../evidence/demo';

export function evidenceDemoRoutes(demo: EvidenceDemo): Router {
  const router = Router();
  router.get('/cases', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(demo.list());
  });
  router.get('/cases/:id/verification', (req, res, next) => {
    try {
      const result = demo.verify(req.params.id!);
      if (!result) {
        return res.status(404).json({ error: 'not_found', message: 'Evidence demonstration case not found' });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });
  return router;
}
