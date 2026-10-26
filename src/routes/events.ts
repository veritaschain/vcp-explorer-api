// Events Routes v1.1
// VeritasChain Standards Organization (VSO)
// "Verify, Don't Trust" - Merkle Proof & Advanced Search

import { Router } from 'express';
import { EventsDataSource } from '../data/events';
import { EventSearchParams, EVENT_TYPE_CODES } from '../types';
import { parseMockSearchTimestampNs } from '../utils/searchTime';

const router = Router();
const dataSource = new EventsDataSource();

// undefined means absent (use the existing default); null means invalid.
// Never coerce arrays/objects, partially parse a string, or round unsafe integers.
function parsePaginationInteger(value: unknown, minimum: number): number | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0 || /[^0-9]/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

/**
 * GET /v1/events/recent
 * 最近のイベント一覧を取得（後方互換性）
 * Query params: limit (1-100, default: 10)
 */
router.get('/recent', async (req, res) => {
  try {
    const parsedLimit = parsePaginationInteger(req.query.limit, 1);
    if (parsedLimit === null) {
      return res.status(400).json({
        error: 'invalid_parameter',
        message: 'Limit must be a single unsigned decimal safe integer greater than zero'
      });
    }
    // Preserve the existing default and cap for valid, explicitly supplied integers.
    const limit = Math.min(parsedLimit ?? 10, 100);

    const events = await dataSource.getRecentEvents(limit);
    return res.json({ events });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return res.status(500).json({
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
    const limit = parsePaginationInteger(req.query.limit, 1);
    const offset = parsePaginationInteger(req.query.offset, 0);
    if (limit === null || offset === null) {
      return res.status(400).json({
        error: 'invalid_parameter',
        message: limit === null
          ? 'Limit must be a single unsigned decimal safe integer greater than zero'
          : 'Offset must be a single unsigned decimal safe integer greater than or equal to zero'
      });
    }
    // Express query objects may contain arrays or nested objects. These
    // filters are scalar identifiers/strings, not implicitly coercible data.
    // Reject them *before* invoking the data source.
    const scalarFields = [
      'trace_id', 'symbol', 'event_type', 'start_time',
      'end_time', 'algo_id', 'venue_id'
    ] as const;
    for (const field of scalarFields) {
      const value = req.query[field];
      if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
        return res.status(400).json({
          error: 'invalid_parameter',
          message: `${field} must be one non-empty string`
        });
      }
    }
    // The runtime guard above already rejects non-string event_type shapes;
    // repeat the type narrowing here so TypeScript can prove the property key.
    const eventType = req.query.event_type;
    if (typeof eventType === 'string' &&
        !Object.prototype.hasOwnProperty.call(EVENT_TYPE_CODES, eventType)) {
      return res.status(400).json({
        error: 'invalid_event_type',
        message: 'Unsupported event_type value'
      });
    }
    // Parse dates precisely before querying. The existing scalar-shape guard
    // above rejects arrays/objects; RFC3339 calendar and time ranges are
    // checked here without lossy Date fractional parsing.
    const startNs = typeof req.query.start_time === 'string'
      ? parseMockSearchTimestampNs(req.query.start_time) : undefined;
    const endNs = typeof req.query.end_time === 'string'
      ? parseMockSearchTimestampNs(req.query.end_time) : undefined;
    if (startNs === null || endNs === null ||
        (startNs !== undefined && endNs !== undefined && startNs > endNs)) {
      return res.status(400).json({
        error: 'invalid_parameter',
        message: 'Time range must contain valid ordered RFC3339 timestamps with at most 9 fractional digits'
      });
    }
    const params: EventSearchParams = {
      trace_id: req.query.trace_id as string,
      symbol: req.query.symbol as string,
      event_type: req.query.event_type as EventSearchParams['event_type'],
      start_time: req.query.start_time as string,
      end_time: req.query.end_time as string,
      algo_id: req.query.algo_id as string,
      venue_id: req.query.venue_id as string,
      limit,
      offset
    };

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key as keyof EventSearchParams] === undefined) {
        delete params[key as keyof EventSearchParams];
      }
    });

    const events = await dataSource.searchEvents(params);
    return res.json({
      events,
      query: params,
      total: events.length
    });
  } catch (error) {
    console.error('Error searching events:', error);
    return res.status(500).json({
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

    return res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({
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

    return res.json(proof);
  } catch (error) {
    console.error('Error fetching Merkle proof:', error);
    return res.status(500).json({
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

    return res.json(certificate);
  } catch (error) {
    console.error('Error generating certificate:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to generate event certificate'
    });
  }
});

export default router;
