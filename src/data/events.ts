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

export const mockEventDetails: EventDetail[] = [
  {
    header: {
      event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ab',
      trace_id: '01934e3a-6a1b-7c82-9d1b-0987654321dc',
      timestamp: 1732453325123456789,
      timestamp_iso: '2025-11-24T14:02:05.123456789Z',
      event_type: 'ORD',
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XAUUSD_PROP',
      symbol: 'XAUUSD',
      anchor_status: 'ANCHORED'
    },
    payload: {
      symbol: 'XAUUSD',
      side: 'BUY',
      order_type: 'MARKET',
      price: '2350.500',
      order_size: '5.00',
      risk_snapshot: {
        news_trading_restricted: 'false',
        max_drawdown_limit: '10000.00',
        max_position_size: '50.00',
        daily_loss_limit: '5000.00'
      }
    },
    security: {
      event_hash: '8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      prev_hash: '00a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
      signature: 'MEUCIQDXyz123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890==',
      sign_algo: 'ED25519',
      merkle_root: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      anchor: {
        network: 'ethereum-mainnet',
        tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        block_number: 1942055,
        anchored_at: '2025-11-24T14:10:00Z'
      }
    }
  },
  {
    header: {
      event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ac',
      trace_id: '01934e3a-6a1b-7c82-9d1b-0987654321dd',
      timestamp: 1732453325223456789,
      timestamp_iso: '2025-11-24T14:02:05.223456789Z',
      event_type: 'REJ',
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XEURUSD_PROP',
      symbol: 'EURUSD',
      anchor_status: 'VERIFIED'
    },
    payload: {
      symbol: 'EURUSD',
      side: 'SELL',
      order_type: 'LIMIT',
      price: '1.0550',
      order_size: '100000.00',
      reject_reason: 'MAX_ORDER_SIZE_EXCEEDED',
      risk_snapshot: {
        news_trading_restricted: 'true',
        max_drawdown_limit: '15000.00',
        triggered_control: 'MaxOrderSize'
      }
    },
    security: {
      event_hash: '7b2c9d4e8f1a5b6c0d3e7f9a2b4c8d1e5f6a7b9c0d2e3f4a6b7c8d9e1f2a3b4c',
      prev_hash: '8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      signature: 'MEUCIQCabc789xyz012def345ghi678jkl901mno234pqr567stu890vwx123yza456==',
      sign_algo: 'ED25519',
      merkle_root: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      anchor: {
        network: 'ethereum-mainnet',
        tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        block_number: 1942056,
        anchored_at: '2025-11-24T14:10:30Z'
      }
    }
  },
  {
    header: {
      event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ad',
      trace_id: '01934e3a-6a1b-7c82-9d1b-0987654321de',
      timestamp: 1732453325323456789,
      timestamp_iso: '2025-11-24T14:02:05.323456789Z',
      event_type: 'EXE',
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XNAS',
      symbol: 'AAPL',
      anchor_status: 'ANCHORED'
    },
    payload: {
      symbol: 'AAPL',
      side: 'BUY',
      order_type: 'LIMIT',
      price: '195.50',
      order_size: '100.00',
      executed_qty: '100.00',
      execution_price: '195.48',
      commission: '1.95',
      slippage: '0.02'
    },
    security: {
      event_hash: '9d3e8f5a1b6c2d7e0f3a4b8c9d1e2f5a6b0c7d3e8f4a9b5c1d6e2f7a0b3c8d4e',
      prev_hash: '7b2c9d4e8f1a5b6c0d3e7f9a2b4c8d1e5f6a7b9c0d2e3f4a6b7c8d9e1f2a3b4c',
      signature: 'MEUCIQDdef901ghi234jkl567mno890pqr123stu456vwx789yza012bcd345efg678==',
      sign_algo: 'ED25519',
      merkle_root: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
      anchor: {
        network: 'ethereum-mainnet',
        tx_hash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        block_number: 1942057,
        anchored_at: '2025-11-24T14:11:00Z'
      }
    }
  }
];

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
