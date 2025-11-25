# VCP Explorer API v1.1

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
- **Structured Payloads** (separates trade/risk/governance data)

---

## 🚀 Quick Start

```bash
cd vcp-explorer-api
npm install
npm run dev
```

Server runs on `http://localhost:3001`

---

## 📡 Key Endpoints

### Advanced Event Search 🆕
```http
GET /v1/events?trace_id=...&symbol=XAUUSD&start_time=2025-11-24T00:00:00Z
```

### Merkle Proof 🆕🔐
```http
GET /v1/events/:id/proof
```
Enables external verification without trusting the API.

### Event Certificate 🆕📜
```http
GET /v1/events/:id/certificate
```
Complete regulatory-compliant certificate with all verification data.

---

## 📖 Full Documentation

See complete API reference, examples, and deployment guides in the sections below.

---

**Version**: 1.1.0 | **VCP Spec**: v1.0 | **Status**: Production Ready

*"Verify, Don't Trust" - Built by VSO*

<h2>Conformance Testing & Example Payloads</h2>
<p>
  Official VCP v1.0 conformance tests and example payload collections are available at:<br>
  <a href='https://github.com/veritaschain/vcp-conformance-guide'>
    https://github.com/veritaschain/vcp-conformance-guide
  </a>
</p>

<p>
  Source code for the VCP Explorer GUI is available at:<br>
  <a href="https://github.com/veritaschain/vcp-explorer-gui">
    https://github.com/veritaschain/vcp-explorer-gui
  </a>
</p>
