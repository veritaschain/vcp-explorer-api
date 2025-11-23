// Rate Limiter Middleware
// VeritasChain Standards Organization (VSO)

import rateLimit from 'express-rate-limit';

/**
 * API全体に適用するレート制限
 * IPアドレスごとに60リクエスト/分
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分間
  max: 60, // IPあたり最大60リクエスト
  standardHeaders: true, // Rate-Limit-* ヘッダーを返す
  legacyHeaders: false, // X-RateLimit-* ヘッダーを無効化
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests from this IP, please try again later'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests from this IP, please try again later',
      retry_after: req.rateLimit?.resetTime || 'unknown'
    });
  }
});

/**
 * より厳しいレート制限（将来の機密エンドポイント用）
 */
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Rate limit exceeded for sensitive endpoint'
  }
});
