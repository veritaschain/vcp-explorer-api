# VCP Explorer API v1.1 - Developer Guide

## 📚 Documentation Files

This package includes three essential files for API integration:

### 1. `openapi.yaml` - OpenAPI 3.1 Specification
**Purpose:** Complete API specification in OpenAPI format

**Use cases:**
- Generate API documentation with Swagger UI
- Auto-generate client SDKs in any language
- API contract validation
- Mock server generation

**Tools:**
```bash
# View in Swagger UI
npx @apidevtools/swagger-cli serve openapi.yaml

# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated-client

# Validate specification
npx @apidevtools/swagger-cli validate openapi.yaml
```

### 2. `types.ts` - TypeScript Type Definitions
**Purpose:** Production-ready type definitions for frontend development

**Use cases:**
- Type-safe API integration in React/Vue/Angular
- IDE autocomplete and IntelliSense
- Compile-time type checking
- Runtime type guards

**Installation:**
```bash
# Copy to your project
cp types.ts src/api/vcp-types.ts

# Or publish as npm package
# @veritaschain/explorer-types
```

### 3. `README.md` - API Documentation
**Purpose:** Human-readable API reference with examples

---

## 🚀 Quick Integration Examples

### React + TypeScript

```typescript
// src/api/vcp-client.ts
import {
  EventDetail,
  EventSearchParams,
  MerkleProof,
  EventType,
  VcpApiError
} from './vcp-types';

const API_BASE_URL = 'https://api-explorer.veritaschain.org/v1';

export class VcpApiClient {
  async searchEvents(params: EventSearchParams): Promise<EventDetail[]> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    );
    
    const response = await fetch(`${API_BASE_URL}/events?${query}`);
    if (!response.ok) {
      const error = await response.json();
      throw new VcpApiError(error.error, error.message, response.status);
    }
    
    const data = await response.json();
    return data.events;
  }

  async getEventById(eventId: string): Promise<EventDetail> {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new VcpApiError(error.error, error.message, response.status);
    }
    
    return response.json();
  }

  async getMerkleProof(eventId: string): Promise<MerkleProof> {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/proof`);
    if (!response.ok) {
      const error = await response.json();
      throw new VcpApiError(error.error, error.message, response.status);
    }
    
    return response.json();
  }
}

// Usage in React component
import { useQuery } from '@tanstack/react-query';

function EventDetailsPage({ eventId }: { eventId: string }) {
  const client = new VcpApiClient();
  
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => client.getEventById(eventId)
  });

  if (isLoading) return <div>Loading...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div>
      <h1>Event {event.header.event_type}</h1>
      <p>Symbol: {event.header.symbol}</p>
      
      {event.payload.vcp_gov && (
        <div>
          <h2>Algorithm</h2>
          <p>ID: {event.payload.vcp_gov.algo_id}</p>
          <p>Type: {event.payload.vcp_gov.algo_type}</p>
        </div>
      )}
      
      {event.payload.vcp_risk && (
        <div>
          <h2>Risk Controls</h2>
          <pre>{JSON.stringify(event.payload.vcp_risk.snapshot, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Python Integration

```python
# vcp_client.py
import requests
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class EventSearchParams:
    trace_id: Optional[str] = None
    symbol: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    limit: int = 50

class VcpApiClient:
    def __init__(self, base_url: str = "https://api-explorer.veritaschain.org/v1"):
        self.base_url = base_url
        self.session = requests.Session()

    def search_events(self, params: EventSearchParams) -> List[Dict]:
        query = {k: v for k, v in params.__dict__.items() if v is not None}
        response = self.session.get(f"{self.base_url}/events", params=query)
        response.raise_for_status()
        return response.json()["events"]

    def get_event_by_id(self, event_id: str) -> Dict:
        response = self.session.get(f"{self.base_url}/events/{event_id}")
        response.raise_for_status()
        return response.json()

    def get_merkle_proof(self, event_id: str) -> Dict:
        response = self.session.get(f"{self.base_url}/events/{event_id}/proof")
        response.raise_for_status()
        return response.json()

# Usage
client = VcpApiClient()

# Search by symbol
events = client.search_events(EventSearchParams(
    symbol="XAUUSD",
    start_time="2025-11-24T00:00:00Z",
    end_time="2025-11-24T23:59:59Z"
))

# Get event details
event = client.get_event_by_id("01934e3a-7b2c-7f93-8f2a-1234567890ab")
print(f"Event type: {event['header']['event_type']}")

# Verify with Merkle proof
proof = client.get_merkle_proof(event['header']['event_id'])
print(f"Root hash: {proof['merkle_proof']['root_hash']}")
```

---

## 🔐 Merkle Proof Verification

### JavaScript/TypeScript

```typescript
import crypto from 'crypto';
import { MerkleProof, EventDetail } from './vcp-types';

/**
 * Verify event inclusion in Merkle tree (RFC 6962)
 */
export function verifyMerkleProof(
  event: EventDetail,
  proof: MerkleProof
): boolean {
  // Step 1: Compute leaf hash
  const canonicalJson = JSON.stringify(event); // Simplified
  const leafHash = crypto
    .createHash('sha256')
    .update(Buffer.concat([Buffer.from([0x00]), Buffer.from(canonicalJson)]))
    .digest();

  // Step 2: Traverse audit path
  let currentHash = leafHash;
  for (const siblingHash of proof.merkle_proof.audit_path) {
    const sibling = Buffer.from(siblingHash, 'hex');
    currentHash = crypto
      .createHash('sha256')
      .update(Buffer.concat([Buffer.from([0x01]), currentHash, sibling]))
      .digest();
  }

  // Step 3: Verify root
  const expectedRoot = proof.merkle_proof.root_hash;
  const computedRoot = currentHash.toString('hex');
  
  return expectedRoot === computedRoot;
}

// Usage
const event = await client.getEventById(eventId);
const proof = await client.getMerkleProof(eventId);

if (verifyMerkleProof(event, proof)) {
  console.log('✓ Event verified - data is authentic');
} else {
  console.error('✗ Verification failed - data may be tampered');
}
```

---

## 📊 Common Patterns

### 1. Track Complete Transaction (TraceID)

```typescript
async function trackTransaction(traceId: string) {
  const events = await client.searchEvents({ trace_id: traceId });
  
  // Sort by timestamp
  const timeline = events.sort((a, b) => 
    a.timestamp.localeCompare(b.timestamp)
  );
  
  console.log('Transaction Timeline:');
  timeline.forEach(e => {
    console.log(`${e.timestamp} - ${e.type} (${e.symbol})`);
  });
  
  return timeline;
}
```

### 2. Monitor Algorithm Performance

```typescript
async function getAlgorithmStats(algoId: string, timeRange: TimeRange) {
  const events = await client.searchEvents({
    algo_id: algoId,
    start_time: timeRange.start_time,
    end_time: timeRange.end_time,
    event_type: EventType.EXE // Only executions
  });

  const stats = {
    total_trades: events.length,
    symbols: new Set(events.map(e => e.symbol)).size,
    total_volume: events.reduce((sum, e) => {
      const size = parseFloat(e.payload.trade_data?.order_size || '0');
      return sum + size;
    }, 0)
  };

  return stats;
}
```

### 3. Generate Compliance Report

```typescript
async function generateComplianceReport(eventIds: string[]) {
  const certificates = await Promise.all(
    eventIds.map(id => client.getEventCertificate(id))
  );

  // Export as JSON for regulatory submission
  const report = {
    generated_at: new Date().toISOString(),
    vcp_version: '1.0',
    certificates
  };

  return JSON.stringify(report, null, 2);
}
```

---

## 🛠️ SDK Generation

### Generate Client from OpenAPI

```bash
# TypeScript (Axios)
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./sdk/typescript

# Python
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./sdk/python

# Go
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o ./sdk/go

# Java
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g java \
  -o ./sdk/java
```

---

## 📝 Best Practices

### 1. Error Handling

```typescript
import { VcpApiError, isApiError } from './vcp-types';

try {
  const event = await client.getEventById(eventId);
} catch (error) {
  if (isApiError(error)) {
    console.error(`API Error: ${error.error} - ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 2. Type Guards

```typescript
import { isEventDetail, hasGovernanceData } from './vcp-types';

const data = await fetch('/api/event').then(r => r.json());

if (isEventDetail(data)) {
  if (hasGovernanceData(data)) {
    console.log('Algorithm:', data.payload.vcp_gov.algo_id);
  }
}
```

### 3. Timestamp Handling

```typescript
import { parseNanosecondTimestamp, formatTimestamp } from './vcp-types';

const event = await client.getEventById(eventId);

// Parse nanosecond timestamp
const date = parseNanosecondTimestamp(event.header.timestamp_int);
console.log('Event time:', date);

// Format for display
const formatted = formatTimestamp(
  event.header.timestamp_iso,
  event.header.timestamp_precision
);
console.log('Formatted:', formatted);
```

---

## 🔍 Testing

### Mock Server

```bash
# Start mock server from OpenAPI spec
npx @stoplight/prism-cli mock openapi.yaml
```

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { getEventTypeCode, EventType } from './vcp-types';

describe('VCP Types', () => {
  it('should convert event type to code', () => {
    expect(getEventTypeCode(EventType.ORD)).toBe(2);
    expect(getEventTypeCode(EventType.EXE)).toBe(4);
  });

  it('should parse nanosecond timestamp', () => {
    const timestamp = '1732453325123456789';
    const date = parseNanosecondTimestamp(timestamp);
    expect(date).toBeInstanceOf(Date);
  });
});
```

---

## 📞 Support

- **API Documentation**: https://docs.veritaschain.org
- **OpenAPI Spec**: https://api-explorer.veritaschain.org/openapi.yaml
- **GitHub**: https://github.com/veritaschain/vcp-explorer-api
- **Email**: standards@veritaschain.org

---

**Happy coding! 🚀**

*Built with ❤️ by VeritasChain Standards Organization*
