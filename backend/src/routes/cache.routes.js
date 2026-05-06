const express = require('express');
const {
  getLastMessageTimestamp,
  getLastCallTimestamp,
  getCachedMessages,
  getCachedCalls,
  saveMessages,
  updateMessageLabel,
  saveCalls,
  updateCallRisk,
  getAllCachedMessages,
} = require('../controllers/cache.controller');
const { protect }    = require('../middlewares/auth');
const { adminOnly }  = require('../middlewares/roleCheck');

const router = express.Router();
router.use(protect);

// Messages
router.get('/messages/last-timestamp', getLastMessageTimestamp);
router.get('/messages',                getCachedMessages);
router.post('/messages/save',          saveMessages);
router.patch('/messages/label',        updateMessageLabel);

// Calls
router.get('/calls/last-timestamp', getLastCallTimestamp);
router.get('/calls',                getCachedCalls);
router.post('/calls/save',          saveCalls);
router.patch('/calls/risk',         updateCallRisk);

// Admin
router.get('/admin/messages', adminOnly, getAllCachedMessages);

module.exports = router;