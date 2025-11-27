<h1 align="center">VCP Explorer</h1>

<p align="center">
  <strong>Official GUI for the VeritasChain Protocol</strong>
</p>

<p align="center">
  <a href="https://github.com/veritaschain/vcp-explorer/releases"><img src="https://img.shields.io/badge/version-3.1.0-blue.svg" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-green.svg" alt="License"></a>
  <a href="https://github.com/veritaschain/vcp-spec"><img src="https://img.shields.io/badge/VCP-v1.0-purple.svg" alt="VCP Version"></a>
  <a href="https://veritaschain.org/explorer/app/"><img src="https://img.shields.io/badge/demo-live-brightgreen.svg" alt="Live Demo"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

VCP Explorer is the official graphical interface for exploring, verifying, and auditing [VeritasChain Protocol (VCP)](https://github.com/veritaschain/vcp-spec) events. Built for regulatory compliance officers, algorithmic traders, and audit professionals.

> **"Verify, Don't Trust"** — Every cryptographic proof can be independently verified client-side.

**🌐 Live Demo:** [veritaschain.org/explorer/app/](https://veritaschain.org/explorer/app/)

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| 🔍 **Event Search** | Query events by ID, type, symbol, or time range |
| ✅ **Merkle Verification** | Client-side RFC 6962 proof validation |
| 🔗 **Chain Visualization** | Interactive SIG→ORD→ACK→EXE lifecycle |
| 📄 **Certificates** | Export compliance certificates as PDF |

### Monitoring

| Feature | Description |
|---------|-------------|
| 🛡️ **Integrity Alerts** | Merkle mismatch, chain breaks, timestamp violations |
| 📊 **Usage Monitoring** | API quota and rate limit warnings |
| 🔔 **Notifications** | Real-time system and event alerts |

### Internationalization

| 🇺🇸 English | 🇯🇵 日本語 | 🇨🇳 中文 | 🇪🇸 Español | 🇩🇪 Deutsch | 🇫🇷 Français | 🇨🇿 Čeština |
|------------|----------|---------|------------|------------|-------------|-------------|

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/veritaschain/vcp-explorer.git
cd vcp-explorer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

---

## Configuration

### Environment

Create `.env.local` for local configuration:

```env
VITE_API_BASE_URL=https://explorer.veritaschain.org/api/v1
```

### Subdirectory Deployment

For deployment to a subdirectory, update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/explorer/app/',
  // ...
});
```

---

## Project Structure

```
vcp-explorer/
├── src/
│   ├── components/
│   │   ├── features/      # Feature-specific components
│   │   ├── layout/        # Header, Sidebar, Layout
│   │   └── ui/            # Reusable UI components
│   ├── i18n/
│   │   ├── locales/       # Translation files (7 languages)
│   │   └── index.ts       # i18n configuration
│   ├── lib/
│   │   ├── api-client.ts  # API integration
│   │   └── crypto.ts      # Cryptographic utilities
│   ├── pages/             # Route components
│   ├── types/             # TypeScript definitions
│   └── App.tsx            # Application root
├── public/
│   └── vcp-logo.svg
├── dist/                  # Production build output
└── package.json
```

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Styling | TailwindCSS |
| Build | Vite 5.4 |
| Routing | React Router |
| i18n | react-i18next |
| Icons | Lucide React |
| Crypto | Web Crypto API |

---

## API Reference

VCP Explorer connects to the VCP Explorer API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | GET | List events |
| `/events/:id` | GET | Get event by ID |
| `/events/:id/proof` | GET | Get Merkle proof |
| `/chain/:trace_id` | GET | Get event chain |
| `/verify` | POST | Verify proof |
| `/certificates/:id` | GET | Get certificate |

See [API Documentation](https://docs.veritaschain.org/api) for details.

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Documentation

- [VCP Explorer Documentation](docs/VCP_Explorer_Documentation.md)
- [Release Notes](docs/VCP_Explorer_v3.1_Release_Notes.md)
- [VCP Specification v1.0](https://github.com/veritaschain/vcp-spec)
- [API Documentation](https://docs.veritaschain.org/api)

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

### Code Style

- ESLint + Prettier configuration included
- Run `npm run lint` before committing

---

## License

Apache License 2.0

Copyright © 2025 VeritasChain Standards Organization (VSO)

See [LICENSE](LICENSE) for details.

---

## Related Projects

| Project | Description |
|---------|-------------|
| [vcp-spec](https://github.com/veritaschain/vcp-spec) | VCP Specification v1.0 |
| [vcp-sdk-ts](https://github.com/veritaschain/vcp-sdk-ts) | TypeScript SDK |
| [vcp-sdk-py](https://github.com/veritaschain/vcp-sdk-py) | Python SDK |
| [vcp-mql-bridge](https://github.com/veritaschain/vcp-mql-bridge) | MQL4/5 Integration |

---

## Support

- **Issues:** [GitHub Issues](https://github.com/veritaschain/vcp-explorer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/veritaschain/vcp-explorer/discussions)
- **Email:** support@veritaschain.org

---

<p align="center">
  <strong>VeritasChain Standards Organization</strong><br>
  <em>"Encoding Trust in the Algorithmic Age"</em><br><br>
  <a href="https://veritaschain.org">veritaschain.org</a>
</p>
