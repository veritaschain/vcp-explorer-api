// VCP Explorer API - Main Server
// VeritasChain Standards Organization (VSO)

import { MIMEType } from 'node:util';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import systemRoutes from './routes/system';
import eventsRoutes from './routes/events';
import entitiesRoutes from './routes/entities';
import { apiLimiter } from './middleware/rateLimiter';
import { loadEvidenceDemo, evidenceOrigin } from './evidence/demo';
import { evidenceDemoRoutes } from './routes/evidenceDemo';

const app = express();
const portValue = process.env.PORT ?? '3001';
const PORT = Number(portValue);
if (!/^\d+$/.test(portValue) || !Number.isSafeInteger(PORT) || PORT > 65535) {
  throw new Error('PORT must be an integer from 0 through 65535');
}
const HOST = process.env.HOST;
const evidenceDemo = loadEvidenceDemo(process.env);
const demoOrigin = evidenceOrigin(process.env, evidenceDemo !== null);

// ====================================
// Security Middleware
// ====================================
app.use(helmet());

// ====================================
// CORS Configuration
// ====================================
const allowedOrigins = [
  'https://veritaschain.org',
  'https://explorer.veritaschain.org',
  'http://localhost:3000', // 開発用
  'http://localhost:5173'  // Vite開発用
];
if (demoOrigin) allowedOrigins.push(demoOrigin);

app.use(cors({
  origin: (origin, callback) => {
    // originがundefined = サーバー間通信、または同じオリジン
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ====================================
// Request Logging
// ====================================
app.use(morgan('combined'));

// ====================================
// Body Parsing
// ====================================
app.use(express.json());
// Keep the API's UTF-8 form contract when the parser also accepts Latin-1.
app.use((req, _res, next) => {
  const contentType = req.get('content-type');
  if (contentType && req.is('application/x-www-form-urlencoded')) {
    const charset = new MIMEType(contentType).params.get('charset');
    if (charset && charset.toLowerCase() !== 'utf-8') {
      next(Object.assign(new Error('Unsupported form charset'), { type: 'charset.unsupported', status: 415 }));
      return;
    }
  }
  next();
});
app.use(express.urlencoded({ extended: true }));

// ====================================
// Rate Limiting
// ====================================
app.use('/v1/', apiLimiter);

// ====================================
// API Routes
// ====================================
app.use('/v1/system', systemRoutes);
app.use('/v1/events', eventsRoutes);
app.use('/v1/certified/entities', entitiesRoutes);
if (evidenceDemo) app.use('/v1/evidence-demo', evidenceDemoRoutes(evidenceDemo));

// ====================================
// Health Check
// ====================================
app.get(['/health', '/v1/health'], (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'VCP Explorer API'
  });
});

// ====================================
// Root Endpoint
// ====================================
app.get('/', (_req, res) => {
  res.json({
    name: 'VeritasChain Protocol Explorer API',
    version: '1.0.0',
    documentation: 'https://docs.veritaschain.org/api',
    endpoints: {
      system: '/v1/system/status',
      events: {
        recent: '/v1/events/recent',
        detail: '/v1/events/:id'
      },
      entities: '/v1/certified/entities',
      health: '/health'
    }
  });
});

// ====================================
// 404 Handler
// ====================================
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found',
    path: req.path
  });
});

// ====================================
// Global Error Handler
// ====================================
// Preserve known body-parser client errors without echoing its message/body.
// Arbitrary errors with a status property still use the generic 500 response.
const parserErrorStatus = new Map([
  ['entity.parse.failed', 400],
  ['querystring.parse.rangeError', 400],
  ['entity.too.large', 413],
  ['parameters.too.many', 413],
  ['charset.unsupported', 415],
  ['encoding.unsupported', 415]
]);
const parserErrorResponses: Record<number, { error: string; message: string }> = {
  400: { error: 'invalid_body', message: 'Request body could not be parsed' },
  413: { error: 'payload_too_large', message: 'Request body exceeds the parser limits' },
  415: { error: 'unsupported_media_type', message: 'Request body charset or encoding is unsupported' }
};
app.use((err: Error & { type?: string; status?: number }, _req: express.Request,
  res: express.Response, _next: express.NextFunction) => {
  const status = parserErrorStatus.get(err.type ?? '');
  if (status !== undefined && err.status === status) {
    res.status(status).json(parserErrorResponses[status]);
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred'
  });
});

// ====================================
// Server Start
// ====================================
const onStarted = () => {
  console.log('');
  console.log('✅ VCP Explorer API Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/v1/`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Available Endpoints:');
  console.log(`  GET /v1/system/status`);
  console.log(`  GET /v1/events/recent?limit=10`);
  console.log(`  GET /v1/events/:id`);
  console.log(`  GET /v1/certified/entities`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
};
export const server = HOST ? app.listen(PORT, HOST, onStarted) : app.listen(PORT, onStarted);

// ====================================
// WebSocket拡張ポイント
// ====================================
// 将来的に /v1/stream/stats エンドポイントを追加する場合:
//
// 1. socket.io をインストール:
//    npm install socket.io @types/socket.io
//
// 2. 以下のコードを追加:
//
// import { Server as SocketIOServer } from 'socket.io';
// import { SystemDataSource } from './data/system';
//
// const httpServer = app.listen(PORT);
// const io = new SocketIOServer(httpServer, {
//   cors: { origin: allowedOrigins }
// });
//
// const systemDataSource = new SystemDataSource();
//
// io.on('connection', (socket) => {
//   console.log('WebSocket client connected:', socket.id);
//
//   // 初期データ送信
//   systemDataSource.getSystemStatus().then(status => {
//     socket.emit('system_stats', status);
//   });
//
//   // リアルタイムストリーム（1秒ごと）
//   const interval = setInterval(async () => {
//     const stats = await systemDataSource.getRealtimeStats();
//     socket.emit('stats_update', stats);
//   }, 1000);
//
//   socket.on('disconnect', () => {
//     clearInterval(interval);
//     console.log('WebSocket client disconnected:', socket.id);
//   });
// });
//
// 3. フロントエンド側の接続例:
//
// import io from 'socket.io-client';
// const socket = io('https://api-explorer.veritaschain.org');
// socket.on('system_stats', (data) => console.log('Initial stats:', data));
// socket.on('stats_update', (data) => console.log('Update:', data));
