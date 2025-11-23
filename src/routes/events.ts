// Events Routes v1.1
// VeritasChain Standards Organization (VSO)
// "Verify, Don't Trust" - Merkle Proof & Advanced Search

import { Router } from 'express';
import { EventsDataSource } from '../data/events';
import { EventSearchParams } from '../types';

const router = Router();
const dataSource = new EventsDataSource();

/**
 * GET /v1/events/recent
 * 最近のイベント一覧を取得（後方互換性）
 * Query params: limit (1-100, default: 10)
 */
router.get('/recent', async (req, res) => {
  try {
    const limitParam = req.query.limit as string;
    const limit = Math.min(parseInt(limitParam) || 10, 100);

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        error: 'invalid_parameter',
        message: 'Limit must be a number between 1 and 100'
      });
    }

    const events = await dataSource.getRecentEvents(limit);
    res.json({ events });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch recent events'
    });
  }
});

/**
 * NEW v1.1: GET /v1/events (Advanced Search)
 * 高度な検索機能 - TraceID、Symbol、Time Range対応
 * Query params: trace_id, symbol, event_type, start_time, end_time, algo_id, venue_id, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const params: EventSearchParams = {
      trace_id: req.query.trace_id as string,
      symbol: req.query.symbol as string,
      event_type: req.query.event_type as any,
      start_time: req.query.start_time as string,
      end_time: req.query.end_time as string,
      algo_id: req.query.algo_id as string,
      venue_id: req.query.venue_id as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key as keyof EventSearchParams] === undefined) {
        delete params[key as keyof EventSearchParams];
      }
    });

    const events = await dataSource.searchEvents(params);
    res.json({
      events,
      query: params,
      total: events.length
    });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to search events'
    });
  }
});

/**
 * GET /v1/events/:id
 * イベントIDで詳細情報を取得
 */
router.get('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    // UUID v7 基本バリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({
        error: 'invalid_event_id',
        message: 'Event ID must be a valid UUID v7 format'
      });
    }

    const event = await dataSource.getEventById(eventId);

    if (!event) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Event not found'
      });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch event details'
    });
  }
});

/**
 * NEW v1.1: GET /v1/events/:id/proof
 * Merkle Proof取得 - RFC 6962準拠
 * "Verify, Don't Trust" - 外部検証用
 */
router.get('/:id/proof', async (req, res) => {
  try {
    const eventId = req.params.id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({
        error: 'invalid_event_id',
        message: 'Event ID must be a valid UUID v7 format'
      });
    }

    const proof = await dataSource.getMerkleProof(eventId);

    if (!proof) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Merkle proof not found for this event'
      });
    }

    res.json(proof);
  } catch (error) {
    console.error('Error fetching Merkle proof:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch Merkle proof'
    });
  }
});

/**
 * NEW v1.1: GET /v1/events/:id/certificate
 * Event Certificate生成 - 規制対応・証明書
 */
router.get('/:id/certificate', async (req, res) => {
  try {
    const eventId = req.params.id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({
        error: 'invalid_event_id',
        message: 'Event ID must be a valid UUID v7 format'
      });
    }

    const certificate = await dataSource.getEventCertificate(eventId);

    if (!certificate) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Certificate cannot be generated for this event'
      });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to generate event certificate'
    });
  }
});

export default router;
