import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.254.9:5000/api';

const request = async (method, endpoint, body = null) => {
  const token = await AsyncStorage.getItem('token');

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) throw { response: { data } };
  return { data };
};

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),
  register: (name, age, email, password) =>
    request('POST', '/auth/register', { name, age, email, password }),
  getMe: () => request('GET', '/auth/me'),
};

// ── SMS ────────────────────────────────────────────────────────────────────
export const smsAPI = {
  analyzeMessage: (message, phoneNumber) =>
    request('POST', '/sms/analyze', { message, phoneNumber }),

  // CHANGED: added messageId parameter (the Android SMS _id)
  // so backend can find and update the exact CachedMessage record
  // when admin makes a decision in Verification tab
  reportMessage: (phoneNumber, messageContent, messageId = null) =>
    request('POST', '/sms/report', { phoneNumber, messageContent, messageId }),
};

// ── Number lookup ──────────────────────────────────────────────────────────
export const numberAPI = {
  lookupNumber: (number) => request('GET', `/numbers/lookup/${number}`),
};

// ── Admin / Community ──────────────────────────────────────────────────────
export const adminAPI = {
  getCommunityStats: () => request('GET', '/admin/community-stats'),
};

// ── Cache API ──────────────────────────────────────────────────────────────
export const cacheAPI = {
  // Messages
  getLastMessageTimestamp: () =>
    request('GET', '/cache/messages/last-timestamp'),
  getCachedMessages: () =>
    request('GET', '/cache/messages'),
  saveMessages: (messages) =>
    request('POST', '/cache/messages/save', { messages }),
  updateMessageLabel: (messageId, label, confidence, classification) =>
    request('PATCH', '/cache/messages/label',
      { messageId, label, confidence, classification }),

  // Calls
  getLastCallTimestamp: () =>
    request('GET', '/cache/calls/last-timestamp'),
  getCachedCalls: () =>
    request('GET', '/cache/calls'),
  saveCalls: (calls) =>
    request('POST', '/cache/calls/save', { calls }),
  updateCallRisk: (callId, riskLevel) =>
    request('PATCH', '/cache/calls/risk', { callId, riskLevel }),
};

export default { request };