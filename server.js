const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://rpc-mainnet.supra.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://rpc-mainnet.supra.com", "https://prod-kline-rest.supra.com"],
      fontSrc: ["'self'", "https://r2cdn.perplexity.ai"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
if (isProduction) {
  app.use(compression());
}

// Static file serving
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: isProduction ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/api/oracle/price/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const apiKey = process.env.SUPRA_ORACLE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Oracle API key not configured' });
    }

    // Real Supra Oracle API call
    const response = await fetch(`https://prod-kline-rest.supra.com/latest?pair=${pair}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Oracle API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Oracle API error:', error);
    res.status(500).json({ error: 'Failed to fetch oracle data' });
  }
});

// Serve main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Oracle Arena server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  
  if (isProduction) {
    console.log('✅ Production mode enabled');
    console.log('🔒 Security features active');
    console.log('📦 Compression enabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
