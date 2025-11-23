/**
 * VCP Explorer API v1.1 - TypeScript Type Definitions
 * VeritasChain Standards Organization (VSO)
 * 
 * Complete type definitions for frontend development
 * 
 * @version 1.1.0
 * @license CC BY 4.0
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Event Type Enum - VCP Spec v1.0
 * @see https://veritaschain.org/vcp-spec#event-types
 */
export enum EventType {
  SIG = 'SIG', // Signal/Decision generated (code: 1)
  ORD = 'ORD', // Order sent (code: 2)
  ACK = 'ACK', // Order acknowledged (code: 3)
  EXE = 'EXE', // Full execution (code: 4)
  PRT = 'PRT', // Partial fill (code: 5)
  REJ = 'REJ', // Order rejected (code: 6)
  CXL = 'CXL', // Order cancelled (code: 7)
  MOD = 'MOD', // Order modified (code: 8)
  CLS = 'CLS', // Position closed (code: 9)
  ALG = 'ALG', // Algorithm update (code: 20)
  RSK = 'RSK', // Risk parameter change (code: 21)
  AUD = 'AUD', // Audit request (code: 22)
  HBT = 'HBT', // Heartbeat (code: 98)
  ERR = 'ERR', // Error (code: 99)
  REC = 'REC', // Recovery (code: 100)
  SNC = 'SNC', // Clock sync status (code: 101)
}

/**
 * Fixed Event Type Codes - IMMUTABLE per VCP Spec v1.0
 */
export const EVENT_TYPE_CODES: Record<EventType, number> = {
  [EventType.SIG]: 1,
  [EventType.ORD]: 2,
  [EventType.ACK]: 3,
  [EventType.EXE]: 4,
  [EventType.PRT]: 5,
  [EventType.REJ]: 6,
  [EventType.CXL]: 7,
  [EventType.MOD]: 8,
  [EventType.CLS]: 9,
  [EventType.ALG]: 20,
  [EventType.RSK]: 21,
  [EventType.AUD]: 22,
  [EventType.HBT]: 98,
  [EventType.ERR]: 99,
  [EventType.REC]: 100,
  [EventType.SNC]: 101,
};

export enum TimestampPrecision {
  NANOSECOND = 'NANOSECOND',
  MICROSECOND = 'MICROSECOND',
  MILLISECOND = 'MILLISECOND',
}

export enum ComplianceTier {
  PLATINUM = 'PLATINUM',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
}

export enum ClockSyncStatus {
  PTP_LOCKED = 'PTP_LOCKED',
  NTP_SYNCED = 'NTP_SYNCED',
  BEST_EFFORT = 'BEST_EFFORT',
  UNRELIABLE = 'UNRELIABLE',
}

export enum HashAlgo {
  SHA256 = 'SHA256',
  SHA3_256 = 'SHA3_256',
  BLAKE3 = 'BLAKE3',
}

export enum SignAlgo {
  ED25519 = 'ED25519',
  ECDSA_SECP256K1 = 'ECDSA_SECP256K1',
  RSA_2048 = 'RSA_2048',
}

export enum EventStatus {
  PENDING = 'PENDING',
  ANCHORED = 'ANCHORED',
  VERIFIED = 'VERIFIED',
}

export enum EntityType {
  EXCHANGE = 'EXCHANGE',
  PROP_FIRM = 'PROP_FIRM',
  BROKER = 'BROKER',
  FUND = 'FUND',
}

export enum EntityStatus {
  COMPLIANT = 'COMPLIANT',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum AlgoType {
  AI_MODEL = 'AI_MODEL',
  RULE_BASED = 'RULE_BASED',
  HYBRID = 'HYBRID',
}

export enum ExplainabilityMethod {
  SHAP = 'SHAP',
  LIME = 'LIME',
  GRADCAM = 'GRADCAM',
  RULE_TRACE = 'RULE_TRACE',
}

export enum RiskClassification {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ControlAction {
  REJECT = 'REJECT',
  MODIFY = 'MODIFY',
  ALERT = 'ALERT',
}

// ============================================================================
// System & Status
// ============================================================================

export interface SystemStatus {
  total_events: number;
  last_anchor: {
    network: string;
    block_number: number;
    tx_hash: string;
    anchored_at: string; // ISO8601
  };
  active_nodes: number;
  precision: TimestampPrecision;
  tier: ComplianceTier;
}

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string; // ISO8601
  version?: string;
  service?: string;
}

// ============================================================================
// Event Summary (List View)
// ============================================================================

export interface EventSummary {
  event_id: string; // UUID v7
  type: EventType;
  event_type_code: number; // Fixed code per VCP Spec
  timestamp: string; // ISO8601
  venue: string;
  symbol: string;
  hash_prefix: string; // First 6 chars of event hash
  status: EventStatus;
}

export interface EventSearchResponse {
  events: EventSummary[];
  query: EventSearchParams;
  total: number;
}

// ============================================================================
// Event Detail (Full Structure)
// ============================================================================

export interface EventDetail {
  header: EventHeader;
  payload: EventPayload;
  security: SecurityData;
}

/**
 * Event Header - VCP-CORE Module
 */
export interface EventHeader {
  event_id: string; // UUID v7
  trace_id: string; // UUID v7 - CAT Rule 613
  timestamp_int: string; // Nanosecond epoch as STRING (avoids JS 2^53)
  timestamp_iso: string; // ISO8601
  event_type: EventType;
  event_type_code: number;
  timestamp_precision: TimestampPrecision;
  clock_sync_status: ClockSyncStatus;
  hash_algo: HashAlgo;
  venue_id: string;
  symbol: string;
  anchor_status: EventStatus;
}

/**
 * Event Payload - VCP Module Structure
 */
export interface EventPayload {
  trade_data?: VcpTradeModule;
  vcp_risk?: VcpRiskModule;
  vcp_gov?: VcpGovModule;
  [key: string]: any; // Allow additional modules
}

/**
 * VCP-TRADE Module
 */
export interface VcpTradeModule {
  symbol: string;
  side?: OrderSide;
  order_type?: string; // MARKET, LIMIT, STOP, STOP_LIMIT
  price?: string; // Always string for precision
  order_size?: string;
  executed_qty?: string;
  execution_price?: string;
  commission?: string;
  slippage?: string;
  [key: string]: string | undefined;
}

/**
 * VCP-RISK Module
 */
export interface VcpRiskModule {
  snapshot: {
    [key: string]: string; // All risk parameters as strings
  };
  triggered_controls?: TriggeredControl[];
}

export interface TriggeredControl {
  control_name: string;
  trigger_value: string;
  action: ControlAction;
  timestamp: string; // Nanosecond epoch as string
}

/**
 * VCP-GOV Module (AI Governance & Explainability)
 */
export interface VcpGovModule {
  algo_id?: string;
  algo_version?: string;
  algo_type?: AlgoType;
  model_hash?: string; // SHA-256 of model parameters
  decision_factors?: DecisionFactors;
  governance?: GovernanceData;
}

export interface DecisionFactors {
  features?: Feature[];
  confidence_score?: string;
  explainability_method?: ExplainabilityMethod;
  rule_trace?: string[];
}

export interface Feature {
  name: string;
  value: string;
  weight?: string;
  contribution?: string; // SHAP/LIME value
}

export interface GovernanceData {
  risk_classification?: RiskClassification; // EU AI Act
  last_approval_by?: string; // OperatorID
  approval_timestamp?: string; // ISO8601
  testing_record_link?: string; // URI to backtest results
}

/**
 * Security Data - VCP-SEC Module
 */
export interface SecurityData {
  event_hash: string;
  prev_hash: string;
  signature: string; // Base64-encoded
  sign_algo: SignAlgo;
  merkle_root: string;
  anchor?: BlockchainAnchor;
}

export interface BlockchainAnchor {
  network: string; // ethereum-mainnet, polygon, etc.
  tx_hash: string;
  block_number: number;
  anchored_at: string; // ISO8601
}

// ============================================================================
// Verification (Merkle Proof & Certificate)
// ============================================================================

/**
 * Merkle Proof - RFC 6962 Compliant
 * "Verify, Don't Trust"
 */
export interface MerkleProof {
  event_id: string;
  event_hash: string;
  merkle_proof: {
    root_hash: string;
    leaf_index: number;
    audit_path: string[]; // Sibling hashes
  };
  anchor_info: BlockchainAnchor;
  hash_algo: HashAlgo;
  verification_hint: string; // Instructions for manual verification
}

/**
 * Event Certificate - Regulatory Compliance
 */
export interface EventCertificate {
  event_id: string;
  generated_at: string; // ISO8601
  system: {
    vcp_version: string;
    tier: ComplianceTier;
  };
  header: EventHeader;
  payload: EventPayload;
  security: SecurityData;
  merkle_proof: MerkleProof['merkle_proof'];
  anchor_info: BlockchainAnchor;
}

// ============================================================================
// Search & Filtering
// ============================================================================

export interface EventSearchParams {
  trace_id?: string; // UUID v7
  symbol?: string;
  event_type?: EventType;
  start_time?: string; // ISO8601
  end_time?: string; // ISO8601
  algo_id?: string;
  venue_id?: string;
  limit?: number; // 1-500, default 50
  offset?: number; // Pagination
}

// ============================================================================
// Certified Entities
// ============================================================================

export interface CertifiedEntity {
  name: string;
  type: EntityType;
  tier: ComplianceTier;
  status: EntityStatus;
  verification_url: string; // URI
  audit_report: string; // e.g., "2025-Q3"
}

export interface CertifiedEntitiesResponse {
  entities: CertifiedEntity[];
}

// ============================================================================
// API Error Handling
// ============================================================================

export interface ApiError {
  error: string; // Error code
  message?: string; // Human-readable message
}

export class VcpApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'VcpApiError';
  }
}

// ============================================================================
// API Client Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination params for list endpoints
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Standard list response wrapper
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Time range filter
 */
export interface TimeRange {
  start_time: string; // ISO8601
  end_time: string; // ISO8601
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(error: any): error is ApiError {
  return error && typeof error.error === 'string';
}

export function isEventDetail(data: any): data is EventDetail {
  return (
    data &&
    typeof data === 'object' &&
    'header' in data &&
    'payload' in data &&
    'security' in data
  );
}

export function isMerkleProof(data: any): data is MerkleProof {
  return (
    data &&
    typeof data === 'object' &&
    'merkle_proof' in data &&
    'anchor_info' in data
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert event type to code
 */
export function getEventTypeCode(type: EventType): number {
  return EVENT_TYPE_CODES[type];
}

/**
 * Convert code to event type
 */
export function getEventTypeFromCode(code: number): EventType | undefined {
  return Object.entries(EVENT_TYPE_CODES).find(([_, c]) => c === code)?.[0] as
    | EventType
    | undefined;
}

/**
 * Parse nanosecond timestamp string to Date
 * @param timestamp_int Nanosecond epoch as string
 */
export function parseNanosecondTimestamp(timestamp_int: string): Date {
  const nanoseconds = BigInt(timestamp_int);
  const milliseconds = Number(nanoseconds / BigInt(1000000));
  return new Date(milliseconds);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(
  timestamp_iso: string,
  precision: TimestampPrecision = TimestampPrecision.MICROSECOND
): string {
  const date = new Date(timestamp_iso);
  const ms = date.getMilliseconds();

  switch (precision) {
    case TimestampPrecision.NANOSECOND:
      return timestamp_iso; // Show full ISO string
    case TimestampPrecision.MICROSECOND:
      return date.toISOString().replace(/\.\d{3}Z$/, `.${ms.toString().padStart(3, '0')}000Z`);
    case TimestampPrecision.MILLISECOND:
      return date.toISOString();
    default:
      return date.toISOString();
  }
}

/**
 * Check if event has VCP-GOV module
 */
export function hasGovernanceData(event: EventDetail): boolean {
  return !!event.payload.vcp_gov;
}

/**
 * Check if event has VCP-RISK module
 */
export function hasRiskData(event: EventDetail): boolean {
  return !!event.payload.vcp_risk;
}

/**
 * Extract tier color for UI
 */
export function getTierColor(tier: ComplianceTier): string {
  switch (tier) {
    case ComplianceTier.PLATINUM:
      return '#E5E7EB'; // Gray for platinum
    case ComplianceTier.GOLD:
      return '#FBBF24'; // Gold
    case ComplianceTier.SILVER:
      return '#9CA3AF'; // Silver
    default:
      return '#6B7280';
  }
}

/**
 * Extract status color for UI
 */
export function getEventStatusColor(status: EventStatus): string {
  switch (status) {
    case EventStatus.ANCHORED:
      return '#10B981'; // Green
    case EventStatus.VERIFIED:
      return '#3B82F6'; // Blue
    case EventStatus.PENDING:
      return '#F59E0B'; // Amber
    default:
      return '#6B7280';
  }
}

// ============================================================================
// Export All
// ============================================================================

export type {
  // Add any type aliases here if needed
};
