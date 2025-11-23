// System Status Routes
// VeritasChain Standards Organization (VSO)

import { Router } from 'express';
import { SystemDataSource } from '../data/system';

const router = Router();
const dataSource = new SystemDataSource();

/**
 * GET /v1/system/status
 * システム全体の統計情報を取得
 */
router.get('/status', async (req, res) => {
  try {
    const status = await dataSource.getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch system status'
    });
  }
});

export default router;
