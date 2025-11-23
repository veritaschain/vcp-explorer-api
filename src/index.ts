// VCP Explorer API - Main Server
// VeritasChain Standards Organization (VSO)

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import systemRoutes from './routes/system';
import eventsRoutes from './routes/events';
import entitiesRoutes from './routes/entities';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3001;

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

// ====================================
// Health Check
// ====================================
app.get('/health', (req, res) => {
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
app.get('/', (req, res) => {
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
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred'
  });
});

// ====================================
// Server Start
// ====================================
app.listen(PORT, () => {
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
});

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
