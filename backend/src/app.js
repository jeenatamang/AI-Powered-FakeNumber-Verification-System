const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes      = require('./routes/auth.routes');
const smsRoutes       = require('./routes/sms.routes');
const numberRoutes    = require('./routes/number.routes');
const adminRoutes     = require('./routes/admin.routes');
const cacheRoutes     = require('./routes/cache.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',      authRoutes);
app.use('/api/sms',       smsRoutes);
app.use('/api/numbers',   numberRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/cache',     cacheRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;