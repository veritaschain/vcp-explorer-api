// VCP Explorer API Type Definitions v1.1
// VeritasChain Standards Organization (VSO)

export type EventType = 'SIG' | 'ORD' | 'ACK' | 'EXE' | 'PRT' | 'REJ' | 'CXL' | 'MOD' | 'CLS' | 'ALG' | 'RSK' | 'AUD' | 'HBT' | 'ERR' | 'REC' | 'SNC';

// VCP Spec v1.0: Fixed Event Type Codes
export const EVENT_TYPE_CODES: Record<EventType, number> = {
  SIG: 1, ORD: 2, ACK: 3, EXE: 4, PRT: 5, REJ: 6, CXL: 7, MOD: 8, CLS: 9,
  ALG: 20, RSK: 21, AUD: 22, HBT: 98, ERR: 99, REC: 100, SNC: 101
};

export type TimestampPrecision = 'NANOSECOND' | 'MICROSECOND' | 'MILLISECOND';
export type ComplianceTier = 'PLATINUM' | 'GOLD' | 'SILVER';
export type ClockSyncStatus = 'PTP_LOCKED' | 'NTP_SYNCED' | 'BEST_EFFORT' | 'UNRELIABLE';
export type HashAlgo = 'SHA256' | 'SHA3_256' | 'BLAKE3';
export type SignAlgo = 'ED25519' | 'ECDSA_SECP256K1' | 'RSA_2048';
export type EventStatus = 'PENDING' | 'ANCHORED' | 'VERIFIED';
export type EntityType = 'EXCHANGE' | 'PROP_FIRM' | 'BROKER' | 'FUND';
export type EntityStatus = 'COMPLIANT' | 'PENDING' | 'REVOKED' | 'SUSPENDED';

export interface SystemStatus {
  total_events: number;
  last_anchor: {
    network: string;
    block_number: number;
    tx_hash: string;
    anchored_at: string;
  };
  active_nodes: number;
  precision: TimestampPrecision;
  tier: ComplianceTier;
}

export interface EventSummary {
  event_id: string;
  type: EventType;
  event_type_code: number; // VCP Spec v1.0: Fixed codes
  timestamp: string;
  venue: string;
  symbol: string;
  hash_prefix: string;
  status: EventStatus;
}

export interface EventDetail {
  header: {
    event_id: string;
    trace_id: string;
    timestamp_int: string; // Nanosecond epoch as STRING (avoids JS 2^53 limit)
    timestamp_iso: string;
    event_type: EventType;
    event_type_code: number; // VCP Spec v1.0: Fixed codes
    timestamp_precision: TimestampPrecision;
    clock_sync_status: ClockSyncStatus;
    hash_algo: HashAlgo;
    venue_id: string;
    symbol: string;
    anchor_status: EventStatus;
  };
  payload: {
    trade_data?: {
      symbol: string;
      side?: 'BUY' | 'SELL';
      order_type?: string;
      price?: string; // Always string for precision
      order_size?: string;
      executed_qty?: string;
      execution_price?: string;
      commission?: string;
      slippage?: string;
      [key: string]: any;
    };
    vcp_risk?: {
      snapshot: {
        max_order_size?: string;
        max_position_size?: string;
        daily_exposure_limit?: string;
        exposure_utilization?: string;
        var_limit?: string;
        current_var?: string;
        throttle_rate?: string;
        circuit_breaker_status?: string;
        [key: string]: string | undefined;
      };
      triggered_controls?: Array<{
        control_name: string;
        trigger_value: string;
        action: string;
        timestamp: string;
      }>;
    };
    vcp_gov?: {
      algo_id?: string;
      algo_version?: string;
      algo_type?: 'AI_MODEL' | 'RULE_BASED' | 'HYBRID';
      model_hash?: string;
      decision_factors?: {
        features?: Array<{
          name: string;
          value: string;
          weight?: string;
          contribution?: string;
        }>;
        confidence_score?: string;
        explainability_method?: 'SHAP' | 'LIME' | 'GRADCAM' | 'RULE_TRACE';
        rule_trace?: string[];
      };
      governance?: {
        risk_classification?: 'HIGH' | 'MEDIUM' | 'LOW';
        last_approval_by?: string;
        approval_timestamp?: string;
        testing_record_link?: string;
      };
    };
    [key: string]: any; // Allow additional data
  };
  security: {
    event_hash: string;
    prev_hash: string;
    signature: string;
    sign_algo: SignAlgo;
    merkle_root: string;
    anchor?: {
      network: string;
      tx_hash: string;
      block_number: number;
      anchored_at: string;
    };
  };
}

// NEW: Merkle Proof for verification
export interface MerkleProof {
  event_id: string;
  event_hash: string;
  merkle_proof: {
    root_hash: string;
    leaf_index: number;
    audit_path: string[]; // Hashes for verification
  };
  anchor_info: {
    network: string;
    tx_hash: string;
    block_number: number;
    anchored_at: string;
  };
  hash_algo: HashAlgo;
  verification_hint: string;
}

// NEW: Event Certificate for regulatory compliance
export interface EventCertificate {
  event_id: string;
  generated_at: string;
  system: {
    vcp_version: string;
    tier: ComplianceTier;
  };
  header: EventDetail['header'];
  payload: EventDetail['payload'];
  security: EventDetail['security'];
  merkle_proof: MerkleProof['merkle_proof'];
  anchor_info: MerkleProof['anchor_info'];
}

// NEW: Event Search Parameters
export interface EventSearchParams {
  trace_id?: string;
  symbol?: string;
  event_type?: EventType;
  start_time?: string; // ISO8601
  end_time?: string; // ISO8601
  algo_id?: string;
  venue_id?: string;
  limit?: number;
  offset?: number;
}

export interface CertifiedEntity {
  name: string;
  type: EntityType;
  tier: ComplianceTier;
  status: EntityStatus;
  verification_url: string;
  audit_report: string;
}

export interface ApiError {
  error: string;
  message?: string;
}
