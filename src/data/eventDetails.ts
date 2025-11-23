// Events Mock Data v1.1 - VCP Module Structure
// VeritasChain Standards Organization (VSO)

import { EventDetail, MerkleProof, EventCertificate, EVENT_TYPE_CODES } from '../types';

export const mockEventDetails: EventDetail[] = [
  {
    header: {
      event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ab',
      trace_id: '01934e3a-6a1b-7c82-9d1b-0987654321dc',
      timestamp_int: '1732453325123456789',
      timestamp_iso: '2025-11-24T14:02:05.123456789Z',
      event_type: 'ORD',
      event_type_code: EVENT_TYPE_CODES.ORD,
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XAUUSD_PROP',
      symbol: 'XAUUSD',
      anchor_status: 'ANCHORED'
    },
    payload: {
      trade_data: {
        symbol: 'XAUUSD',
        side: 'BUY',
        order_type: 'MARKET',
        price: '2350.500',
        order_size: '5.00'
      },
      vcp_risk: {
        snapshot: {
          news_trading_restricted: 'false',
          max_drawdown_limit: '10000.00',
          max_position_size: '50.00',
          daily_loss_limit: '5000.00',
          exposure_utilization: '0.45',
          throttle_rate: '100',
          circuit_breaker_status: 'NORMAL'
        },
        triggered_controls: []
      },
      vcp_gov: {
        algo_id: 'neural-scalper-v1.2',
        algo_version: '1.2.0',
        algo_type: 'AI_MODEL',
        model_hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        decision_factors: {
          features: [
            { name: 'rsi_14', value: '72.5', weight: '0.35', contribution: '0.28' },
            { name: 'macd_signal', value: '1.25', weight: '0.25', contribution: '0.18' },
            { name: 'volume_ratio', value: '1.8', weight: '0.20', contribution: '0.15' }
          ],
          confidence_score: '0.92',
          explainability_method: 'SHAP'
        },
        governance: {
          risk_classification: 'MEDIUM',
          last_approval_by: 'op_john_doe',
          approval_timestamp: '2025-11-20T09:00:00Z',
          testing_record_link: 'https://internal.veritaschain.org/backtest/neural-scalper-v1.2'
        }
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
      timestamp_int: '1732453325223456789',
      timestamp_iso: '2025-11-24T14:02:05.223456789Z',
      event_type: 'REJ',
      event_type_code: EVENT_TYPE_CODES.REJ,
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XEURUSD_PROP',
      symbol: 'EURUSD',
      anchor_status: 'VERIFIED'
    },
    payload: {
      trade_data: {
        symbol: 'EURUSD',
        side: 'SELL',
        order_type: 'LIMIT',
        price: '1.0550',
        order_size: '100000.00'
      },
      vcp_risk: {
        snapshot: {
          news_trading_restricted: 'true',
          max_order_size: '50000.00',
          max_drawdown_limit: '15000.00',
          exposure_utilization: '0.95',
          var_limit: '20000.00',
          current_var: '18500.00'
        },
        triggered_controls: [
          {
            control_name: 'MaxOrderSize',
            trigger_value: '100000.00',
            action: 'REJECT',
            timestamp: '1732453325223456789'
          }
        ]
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
      timestamp_int: '1732453325323456789',
      timestamp_iso: '2025-11-24T14:02:05.323456789Z',
      event_type: 'EXE',
      event_type_code: EVENT_TYPE_CODES.EXE,
      timestamp_precision: 'NANOSECOND',
      clock_sync_status: 'PTP_LOCKED',
      hash_algo: 'SHA256',
      venue_id: 'XNAS',
      symbol: 'AAPL',
      anchor_status: 'ANCHORED'
    },
    payload: {
      trade_data: {
        symbol: 'AAPL',
        side: 'BUY',
        order_type: 'LIMIT',
        price: '195.50',
        order_size: '100.00',
        executed_qty: '100.00',
        execution_price: '195.48',
        commission: '1.95',
        slippage: '0.02'
      }
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

// Merkle Proof Mock Data
export const mockMerkleProofs: Record<string, MerkleProof> = {
  '01934e3a-7b2c-7f93-8f2a-1234567890ab': {
    event_id: '01934e3a-7b2c-7f93-8f2a-1234567890ab',
    event_hash: '8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    merkle_proof: {
      root_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      leaf_index: 42,
      audit_path: [
        '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        '9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
        '1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f'
      ]
    },
    anchor_info: {
      network: 'ethereum-mainnet',
      tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      block_number: 1942055,
      anchored_at: '2025-11-24T14:10:00Z'
    },
    hash_algo: 'SHA256',
    verification_hint: 'RFC 6962: Compute leaf = SHA256(0x00 || canonical_json), then hash with each audit_path element using SHA256(0x01 || left || right) to match root_hash.'
  }
};

export { mockEventSummaries } from './events';
