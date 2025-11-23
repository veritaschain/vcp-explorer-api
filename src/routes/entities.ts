// Certified Entities Routes
// VeritasChain Standards Organization (VSO)

import { Router } from 'express';
import { EntitiesDataSource } from '../data/entities';

const router = Router();
const dataSource = new EntitiesDataSource();

/**
 * GET /v1/certified/entities
 * VC-Certified取得企業の一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    const entities = await dataSource.getCertifiedEntities();
    res.json({ entities });
  } catch (error) {
    console.error('Error fetching certified entities:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch certified entities'
    });
  }
});

export default router;
