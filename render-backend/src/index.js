import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import chartRoutes from './routes/chart.js';
import reportRoutes from './routes/report.js';
import webhookRoutes from './routes/webhook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-WP-User-ID', 'X-WP-Site-URL']
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api', chartRoutes);
app.use('/api', reportRoutes);
app.use('/api', webhookRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Fraktal API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Endpoints:`);
  console.log(`   - POST /api/calculate-chart`);
  console.log(`   - POST /api/generate-report`);
  console.log(`   - POST /api/wordpress-webhook`);
});
