# VCP Explorer API v1.1 - Complete API Reference

**"Verify, Don't Trust" - Merkle Proof Verification & VCP Module Structure**

Production-ready API with cryptographic verification, advanced search, and full VCP Specification v1.0 compliance.

---

## 🎯 What's New in v1.1

### ✅ Verification Features (RFC 6962 Compliant)
- **Merkle Proof API** (`/v1/events/:id/proof`) - External verification capability
- **Event Certificate** (`/v1/events/:id/certificate`) - Regulatory compliance export

### ✅ VCP Module Structure
- **VCP-TRADE** - Trading data
- **VCP-RISK** - Risk parameter snapshots  
- **VCP-GOV** - Algorithm governance & AI explainability

### ✅ Advanced Search
- **TraceID** - Track complete transaction lifecycle
- **Symbol, Time Range, Event Type** - Audit-ready filtering
- **Algo ID** - Algorithm-specific event filtering

### ✅ VCP Spec v1.0 Compliance
- **Fixed Event Type Codes** (1=SIG, 2=ORD, etc.)
- **String-based Timestamps** (avoids JS 2^53 limit)
- **RFC 8785 JSON Canonicalization** + HashAlgo Enum (SHA256/SHA3_256/BLAKE3)

---

## 🚀 Quick Start

```bash
cd vcp-explorer-api
npm install
npm run dev
```

Server runs on `http://localhost:3001`

---

## 📡 API Endpoints

### Base URL
- **Development**: `http://localhost:3001/v1/`
- **Production**: `https://api-explorer.veritaschain.org/v1/`

---

## 1. System Status

```http
GET /v1/system/status
```

Returns global system statistics.

**Response:**
```json
{
  "total_events": 12160243,
  "last_anchor": {
    "network": "ethereum-mainnet",
    "block_number": 1942055,
    "tx_hash": "0x1234567890abcdef...",
    "anchored_at": "2025-11-24T14:12:00Z"
  },
  "active_nodes": 42,
  "precision": "NANOSECOND",
  "tier": "PLATINUM"
}
```

---

## 2. Advanced Event Search 🆕

```http
GET /v1/events
```

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `trace_id` | UUID v7 | No | Transaction trace ID (tracks SIG→ORD→ACK→EXE chain) | `01934e3a-6a1b-7c82-9d1b-0987654321dc` |
| `symbol` | String | No | Trading symbol | `XAUUSD`, `EURUSD`, `BTCUSDT` |
| `event_type` | String | No | Event type name (see Event Types table) | `ORD`, `EXE`, `REJ` |
| `event_type_code` | Integer | No | Fixed VCP code (1-255) | `2` (=ORD), `4` (=EXE) |
| `start_time` | ISO8601 | No | Start of time range (inclusive) | `2025-11-24T00:00:00Z` |
| `end_time` | ISO8601 | No | End of time range (inclusive) | `2025-11-24T23:59:59Z` |
| `algo_id` | String | No | Algorithm identifier from VCP-GOV | `neural-scalper-v1.2` |
| `venue_id` | String | No | Venue/broker/exchange identifier | `XNAS`, `BINANCE` |
| `limit` | Integer | No | Maximum results (1-500, default: 50) | `100` |
| `offset` | Integer | No | Pagination offset (default: 0) | `50` |

**Event Types Reference:**

| Code | Type | Description |
|------|------|-------------|
| 1 | SIG | Signal/Decision generated |
| 2 | ORD | Order sent |
| 3 | ACK | Order acknowledged |
| 4 | EXE | Full execution |
| 5 | PRT | Partial fill |
| 6 | REJ | Order rejected |
| 7 | CXL | Order cancelled |
| 20 | ALG | Algorithm update |
| 21 | RSK | Risk parameter change |
| 98 | HBT | Heartbeat |
| 99 | ERR | Error |

### Example Requests

```bash
# Track complete transaction by TraceID
GET /v1/events?trace_id=01934e3a-6a1b-7c82-9d1b-0987654321dc

# Find all XAUUSD orders in time window
GET /v1/events?symbol=XAUUSD&start_time=2025-11-24T14:00:00Z&end_time=2025-11-24T15:00:00Z

# Filter by algorithm and event type
GET /v1/events?algo_id=neural-scalper-v1.2&event_type=ORD

# Pagination
GET /v1/events?symbol=EURUSD&limit=100&offset=0
```

### Response

```json
{
  "events": [
    {
      "event_id": "01934e3a-7b2c-7f93-8f2a-1234567890ab",
      "type": "ORD",
      "event_type_code": 2,
      "timestamp": "2025-11-24T14:02:05.123456789Z",
      "venue": "XAUUSD_PROP",
      "symbol": "XAUUSD",
      "hash_prefix": "8f2a7b",
      "status": "ANCHORED"
    }
  ],
  "query": { /* applied filters */ },
  "total": 42
}
```

---

## 3. Event Details (VCP Module Structure) 🔄

```http
GET /v1/events/:id
```

**Path Parameter:**
- `id` (UUID v7): Event identifier

### Response Structure

```json
{
  "header": {
    "event_id": "01934e3a-7b2c-7f93-8f2a-1234567890ab",
    "trace_id": "01934e3a-6a1b-7c82-9d1b-0987654321dc",
    "timestamp_int": "1732453325123456789",
    "timestamp_iso": "2025-11-24T14:02:05.123456789Z",
    "event_type": "ORD",
    "event_type_code": 2,
    "timestamp_precision": "NANOSECOND",
    "clock_sync_status": "PTP_LOCKED",
    "hash_algo": "SHA256",
    "venue_id": "XAUUSD_PROP",
    "symbol": "XAUUSD",
    "anchor_status": "ANCHORED"
  },
  "payload": {
    "trade_data": {
      "symbol": "XAUUSD",
      "side": "BUY",
      "order_type": "MARKET",
      "price": "2350.500",
      "order_size": "5.00"
    },
    "vcp_risk": {
      "snapshot": {
        "news_trading_restricted": "false",
        "max_drawdown_limit": "10000.00",
        "max_position_size": "50.00",
        "exposure_utilization": "0.45",
        "throttle_rate": "100",
        "circuit_breaker_status": "NORMAL"
      },
      "triggered_controls": []
    },
    "vcp_gov": {
      "algo_id": "neural-scalper-v1.2",
      "algo_version": "1.2.0",
      "algo_type": "AI_MODEL",
      "model_hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "decision_factors": {
        "features": [
          {
            "name": "rsi_14",
            "value": "72.5",
            "weight": "0.35",
            "contribution": "0.28"
          },
          {
            "name": "macd_signal",
            "value": "1.25",
            "weight": "0.25",
            "contribution": "0.18"
          }
        ],
        "confidence_score": "0.92",
        "explainability_method": "SHAP"
      },
      "governance": {
        "risk_classification": "MEDIUM",
        "last_approval_by": "op_john_doe",
        "approval_timestamp": "2025-11-20T09:00:00Z",
        "testing_record_link": "https://internal.veritaschain.org/backtest/neural-scalper-v1.2"
      }
    }
  },
  "security": {
    "event_hash": "8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    "prev_hash": "00a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    "signature": "MEUCIQDXyz123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890==",
    "sign_algo": "ED25519",
    "merkle_root": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "anchor": {
      "network": "ethereum-mainnet",
      "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      "block_number": 1942055,
      "anchored_at": "2025-11-24T14:10:00Z"
    }
  }
}
```

### Module Structure Explained

- **`header`** (VCP-CORE): Standard event metadata with VCP Spec v1.0 compliance
  - `timestamp_int`: STRING to avoid JS 2^53 limit for nanosecond precision
  - `event_type_code`: Fixed codes per VCP Spec (immutable)
  - `clock_sync_status`: PTP_LOCKED / NTP_SYNCED / BEST_EFFORT / UNRELIABLE

- **`payload.trade_data`** (VCP-TRADE): Trading-specific data
  - All numeric values as STRINGS for precision (IEEE 754 issue avoidance)

- **`payload.vcp_risk`** (VCP-RISK): Risk management snapshot
  - `snapshot`: Active risk parameters at event time
  - `triggered_controls`: Array of controls that fired (e.g., MaxOrderSize REJECT)

- **`payload.vcp_gov`** (VCP-GOV): Algorithm governance & AI explainability
  - `algo_id`: Algorithm identifier
  - `model_hash`: SHA-256 of model parameters (immutable)
  - `decision_factors`: XAI data (SHAP/LIME values)
  - `governance`: EU AI Act compliance (risk classification, human approval)

- **`security`** (VCP-SEC): Cryptographic protection
  - `event_hash`: SHA-256 hash of canonical event
  - `prev_hash`: Hash chain linkage
  - `signature`: Ed25519 digital signature (base64)
  - `merkle_root`: Root of Merkle tree for anchoring
  - `anchor`: Blockchain anchor point

---

## 4. Merkle Proof (Verification) 🆕🔐

```http
GET /v1/events/:id/proof
```

**Purpose:** Enable external verification without trusting the API ("Verify, Don't Trust")

**Path Parameter:**
- `id` (UUID v7): Event identifier

### Response Schema

```json
{
  "event_id": "01934e3a-7b2c-7f93-8f2a-1234567890ab",
  "event_hash": "8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
  "merkle_proof": {
    "root_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "leaf_index": 42,
    "audit_path": [
      "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f"
    ]
  },
  "anchor_info": {
    "network": "ethereum-mainnet",
    "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    "block_number": 1942055,
    "anchored_at": "2025-11-24T14:10:00Z"
  },
  "hash_algo": "SHA256",
  "verification_hint": "RFC 6962: Compute leaf = SHA256(0x00 || canonical_json), then hash with each audit_path element using SHA256(0x01 || left || right) to match root_hash."
}
```

### Verification Process (RFC 6962)

**Step 1: Compute Leaf Hash**
```
canonical_event = RFC_8785_canonicalize(event_json)
leaf_hash = SHA256(0x00 || canonical_event)
```

**Step 2: Traverse Audit Path**
```
current_hash = leaf_hash
for sibling_hash in audit_path:
    current_hash = SHA256(0x01 || current_hash || sibling_hash)
```

**Step 3: Verify Root**
```
current_hash == merkle_proof.root_hash
```

### Hash & Canonicalization

All Merkle proof operations follow **VCP Spec v1.0**:
- **JSON Canonicalization**: RFC 8785 (JCS)
- **Hash Algorithm**: Specified in `hash_algo` field
  - `SHA256` (default)
  - `SHA3_256` (supported)
  - `BLAKE3` (supported)
- **Merkle Tree**: RFC 6962 (Certificate Transparency)
  - Leaf nodes: `0x00` prefix
  - Internal nodes: `0x01` prefix

---

## 5. Event Certificate 🆕📜

```http
GET /v1/events/:id/certificate
```

**Purpose:** Generate regulatory-compliant certificate with all verification data

**Path Parameter:**
- `id` (UUID v7): Event identifier

### Response Schema

```json
{
  "event_id": "01934e3a-7b2c-7f93-8f2a-1234567890ab",
  "generated_at": "2025-11-24T15:00:00Z",
  "system": {
    "vcp_version": "1.0",
    "tier": "PLATINUM"
  },
  "header": {
    "event_id": "01934e3a-7b2c-7f93-8f2a-1234567890ab",
    "trace_id": "01934e3a-6a1b-7c82-9d1b-0987654321dc",
    "timestamp_int": "1732453325123456789",
    "timestamp_iso": "2025-11-24T14:02:05.123456789Z",
    "event_type": "ORD",
    "event_type_code": 2,
    "timestamp_precision": "NANOSECOND",
    "clock_sync_status": "PTP_LOCKED",
    "hash_algo": "SHA256",
    "venue_id": "XAUUSD_PROP",
    "symbol": "XAUUSD",
    "anchor_status": "ANCHORED"
  },
  "payload": {
    "trade_data": {
      "symbol": "XAUUSD",
      "side": "BUY",
      "order_type": "MARKET",
      "price": "2350.500",
      "order_size": "5.00"
    },
    "vcp_risk": {
      "snapshot": {
        "news_trading_restricted": "false",
        "max_drawdown_limit": "10000.00"
      }
    },
    "vcp_gov": {
      "algo_id": "neural-scalper-v1.2",
      "model_hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
    }
  },
  "security": {
    "event_hash": "8f2a7b9d1b0c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    "prev_hash": "00a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    "signature": "MEUCIQDXyz123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890==",
    "sign_algo": "ED25519",
    "merkle_root": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
  },
  "merkle_proof": {
    "root_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "leaf_index": 42,
    "audit_path": [
      "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d"
    ]
  },
  "anchor_info": {
    "network": "ethereum-mainnet",
    "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    "block_number": 1942055,
    "anchored_at": "2025-11-24T14:10:00Z"
  }
}
```

**Use Cases:**
- Trader proof of legitimate execution
- Regulatory submission (MiFID II, EU AI Act)
- Audit trail documentation
- Dispute resolution evidence

---

## 6. Certified Entities

```http
GET /v1/certified/entities
```

Returns list of VC-Certified organizations.

**Response:**
```json
{
  "entities": [
    {
      "name": "Alpha Quant Exchange",
      "type": "EXCHANGE",
      "tier": "PLATINUM",
      "status": "COMPLIANT",
      "verification_url": "https://explorer.veritaschain.org/entities/alpha-quant",
      "audit_report": "2025-Q3"
    }
  ]
}
```

---

## 7. Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-24T14:30:00.000Z",
  "version": "1.1.0",
  "service": "VCP Explorer API"
}
```

---

## 📋 HTTP Status Codes & Error Model

### Success Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |

### Client Error Codes

| Code | Error | Description | Example |
|------|-------|-------------|---------|
| `400` | `invalid_parameter` | Invalid query parameter | `limit` must be 1-500 |
| `400` | `invalid_event_id` | Event ID format invalid | Must be UUID v7 |
| `400` | `invalid_event_type` | Unknown event type | Valid: SIG, ORD, ACK, EXE, ... |
| `400` | `invalid_time_range` | Invalid ISO8601 timestamp | Use format: 2025-11-24T00:00:00Z |
| `404` | `not_found` | Resource not found | Event does not exist |
| `422` | `proof_not_available` | Merkle proof not ready | Event not yet anchored |

### Server Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `429` | `rate_limit_exceeded` | Too many requests | 60 requests/min limit |
| `500` | `internal_error` | Internal server error | Unexpected failure |

### Error Response Format

```json
{
  "error": "invalid_parameter",
  "message": "Limit must be a number between 1 and 500"
}
```

### Example Error Scenarios

**Invalid Event Type:**
```bash
GET /v1/events?event_type=INVALID
```
```json
{
  "error": "invalid_event_type",
  "message": "Event type must be one of: SIG, ORD, ACK, EXE, PRT, REJ, CXL, MOD, CLS, ALG, RSK, AUD, HBT, ERR, REC, SNC"
}
```

**Event Not Found:**
```bash
GET /v1/events/01934e3a-0000-7000-0000-000000000000
```
```json
{
  "error": "not_found",
  "message": "Event not found"
}
```

**Proof Not Yet Available:**
```bash
GET /v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab/proof
```
```json
{
  "error": "proof_not_available",
  "message": "Merkle proof not available - event not yet anchored"
}
```

---

## 🔒 Security & Rate Limiting

### CORS Configuration
- **Allowed Origins**: `https://veritaschain.org`, `https://explorer.veritaschain.org`
- **Development**: `http://localhost:3000`, `http://localhost:5173`

### Rate Limits
- **Default**: 60 requests per minute per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

### Security Headers (Helmet.js)
- XSS Protection
- Content Security Policy
- HSTS
- Frame Options

---

## 🧪 Testing Examples

```bash
# System status
curl http://localhost:3001/v1/system/status

# Search events
curl "http://localhost:3001/v1/events?symbol=XAUUSD&limit=5"

# TraceID search
curl "http://localhost:3001/v1/events?trace_id=01934e3a-6a1b-7c82-9d1b-0987654321dc"

# Event details
curl http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab

# Merkle proof
curl http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab/proof

# Certificate
curl http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab/certificate

# Health check
curl http://localhost:3001/health
```

---

## 📝 Development Scripts

```bash
npm run dev      # Development with hot-reload
npm run build    # TypeScript compilation
npm start        # Production server
npm run lint     # ESLint check
npm run format   # Prettier formatting
```

---

## 📄 Additional Resources

- **OpenAPI Spec**: `openapi.yaml` (Swagger/Postman import)
- **TypeScript Types**: `types.ts` (Frontend integration)
- **Developer Guide**: `DEVELOPER_GUIDE.md` (Integration examples)
- **VCP Specification**: https://veritaschain.org/vcp-spec

---

## 📄 License

CC BY 4.0 International - VeritasChain Standards Organization (VSO)

---

## 📞 Support

- **Documentation**: https://docs.veritaschain.org
- **GitHub**: https://github.com/veritaschain/vcp-explorer-api
- **Email**: standards@veritaschain.org

---

**Version**: 1.1.0  
**VCP Spec**: v1.0  
**Status**: Production Ready

*"Verify, Don't Trust" - Built by VSO with ❤️*
