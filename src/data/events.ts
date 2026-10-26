// Events Mock Data and Data Source v1.1
// VeritasChain Standards Organization (VSO)

import { EventSummary, EventDetail, MerkleProof, EventCertificate, EventSearchParams, EVENT_TYPE_CODES } from '../types';

export const mockEventSummaries: EventSummary[] = [
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ab',
    type: 'ORD',
    event_type_code: EVENT_TYPE_CODES.ORD,
    timestamp: '2025-11-24T14:02:05.123456789Z',
    venue: 'XAUUSD_PROP',
    symbol: 'XAUUSD',
    hash_prefix: '8f2a7b',
    status: 'ANCHORED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ac',
    type: 'REJ',
    event_type_code: EVENT_TYPE_CODES.REJ,
    timestamp: '2025-11-24T14:02:05.223456789Z',
    venue: 'XEURUSD_PROP',
    symbol: 'EURUSD',
    hash_prefix: '7b2c9d',
    status: 'VERIFIED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ad',
    type: 'EXE',
    event_type_code: EVENT_TYPE_CODES.EXE,
    timestamp: '2025-11-24T14:02:05.323456789Z',
    venue: 'XNAS',
    symbol: 'AAPL',
    hash_prefix: '9d3e8f',
    status: 'ANCHORED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ae',
    type: 'SIG',
    event_type_code: EVENT_TYPE_CODES.SIG,
    timestamp: '2025-11-24T14:02:05.423456789Z',
    venue: 'BINANCE',
    symbol: 'BTCUSDT',
    hash_prefix: '4f5a6b',
    status: 'VERIFIED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890af',
    type: 'ALG',
    event_type_code: EVENT_TYPE_CODES.ALG,
    timestamp: '2025-11-24T14:02:05.523456789Z',
    venue: 'INTERNAL',
    symbol: 'N/A',
    hash_prefix: '2c3d4e',
    status: 'ANCHORED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890b0',
    type: 'HBT',
    event_type_code: EVENT_TYPE_CODES.HBT,
    timestamp: '2025-11-24T14:02:05.623456789Z',
    venue: 'XNAS',
    symbol: 'SYSTEM',
    hash_prefix: '1a2b3c',
    status: 'VERIFIED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890b1',
    type: 'ACK',
    event_type_code: EVENT_TYPE_CODES.ACK,
    timestamp: '2025-11-24T14:02:05.723456789Z',
    venue: 'XAUUSD_PROP',
    symbol: 'XAUUSD',
    hash_prefix: '5d6e7f',
    status: 'ANCHORED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890b2',
    type: 'RSK',
    event_type_code: EVENT_TYPE_CODES.RSK,
    timestamp: '2025-11-24T14:02:05.823456789Z',
    venue: 'INTERNAL',
    symbol: 'N/A',
    hash_prefix: '8g9h0i',
    status: 'VERIFIED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890b3',
    type: 'CXL',
    event_type_code: EVENT_TYPE_CODES.CXL,
    timestamp: '2025-11-24T14:02:05.923456789Z',
    venue: 'XNAS',
    symbol: 'TSLA',
    hash_prefix: '9a0b1c',
    status: 'ANCHORED'
  },
  {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890b4',
    type: 'PRT',
    event_type_code: EVENT_TYPE_CODES.PRT,
    timestamp: '2025-11-24T14:02:06.023456789Z',
    venue: 'BINANCE',
    symbol: 'ETHUSDT',
    hash_prefix: '0c1d2e',
    status: 'VERIFIED'
  }
];

// Keep the public export backed by the same v1.1 fixtures used by the API.
export { mockEventDetails } from './eventDetails';

/**
 * Data Source Layer for Events v1.1
 * 将来的にデータベースやVCPログストレージに置き換え可能
 */
export class EventsDataSource {
  /**
   * 最近のイベント一覧を取得
   * @param limit 取得件数（最大100）
   */
  async getRecentEvents(limit: number = 10): Promise<EventSummary[]> {
    // 将来: SELECT * FROM events ORDER BY timestamp DESC LIMIT ?
    return mockEventSummaries.slice(0, limit);
  }

  /**
   * イベントIDでイベント詳細を取得
   * @param eventId UUID v7形式のイベントID
   */
  async getEventById(eventId: string): Promise<EventDetail | null> {
    // Import from eventDetails
    const { mockEventDetails } = await import('./eventDetails');
    return mockEventDetails.find(e => e.header.event_id === eventId) || null;
  }

  /**
   * NEW v1.1: 高度な検索機能
   * @param params 検索パラメータ
   */
  async searchEvents(params: EventSearchParams): Promise<EventSummary[]> {
    // 将来: 複雑なSQLクエリでフィルタリング
    let results = [...mockEventSummaries];

    if (params.trace_id) {
      // TraceIDでフィルタリング
      const details = await import('./eventDetails');
      const matchingIds = details.mockEventDetails
        .filter(e => e.header.trace_id === params.trace_id)
        .map(e => e.header.event_id);
      results = results.filter(e => matchingIds.includes(e.event_id));
    }

    if (params.symbol) {
      results = results.filter(e => e.symbol === params.symbol);
    }

    if (params.algo_id) {
      // The mock summary carries no algorithm ID. Resolve it only from
      // available detailed VCP-GOV fixtures; missing details cannot match.
      // Do not infer an algorithm from symbol, venue or event type.
      const { mockEventDetails } = await import('./eventDetails');
      const matchingIds = new Set(
        mockEventDetails
          .filter(detail => detail.payload.vcp_gov?.algo_id === params.algo_id)
          .map(detail => detail.header.event_id)
      );
      results = results.filter(event => matchingIds.has(event.event_id));
    }

    if (params.event_type) {
      results = results.filter(e => e.type === params.event_type);
    }

    if (params.venue_id) {
      results = results.filter(e => e.venue === params.venue_id);
    }

    // Time range filtering (simplified for mock)
    if (params.start_time || params.end_time) {
      results = results.filter(e => {
        const eventTime = new Date(e.timestamp);
        if (params.start_time && eventTime < new Date(params.start_time)) return false;
        if (params.end_time && eventTime > new Date(params.end_time)) return false;
        return true;
      });
    }

    // Pagination
    const offset = params.offset || 0;
    const limit = Math.min(params.limit || 50, 500);
    return results.slice(offset, offset + limit);
  }

  /**
   * NEW v1.1: Merkle Proof取得（Verify, Don't Trust）
   * @param eventId イベントID
   */
  async getMerkleProof(eventId: string): Promise<MerkleProof | null> {
    const { mockMerkleProofs } = await import('./eventDetails');
    return mockMerkleProofs[eventId] || null;
  }

  /**
   * NEW v1.1: Event Certificate生成
   * @param eventId イベントID
   */
  async getEventCertificate(eventId: string): Promise<EventCertificate | null> {
    const event = await this.getEventById(eventId);
    if (!event) return null;

    const proof = await this.getMerkleProof(eventId);
    if (!proof) return null;

    return {
      event_id: eventId,
      generated_at: new Date().toISOString(),
      system: {
        vcp_version: '1.0',
        tier: 'PLATINUM'
      },
      header: event.header,
      payload: event.payload,
      security: event.security,
      merkle_proof: proof.merkle_proof,
      anchor_info: proof.anchor_info
    };
  }
}
