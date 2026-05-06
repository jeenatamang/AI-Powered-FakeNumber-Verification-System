// mobile-app/src/services/smsService.js
import { Platform, PermissionsAndroid } from 'react-native';

// ── Trusted senders — NEVER analyze these ─────────────────────────────────
export const TRUSTED_SENDERS = [
  'NABIL', 'AT_ALERT', 'ST_ALERT', 'AUTHMSG','NABILALERT', 'PRIMEBANK', 'PRIMEALERT', 'PRIME',
  'NBBANK', 'PRBU_BANK',  'Ncell Flash','SANIMA', 'SANIMABANK', 'HIMALAYAN', 'HBL',
  'NICASIA', 'NIC',  'Google', 'Missedcall', 'FMDU-NCELL', 'CTZN_ALERT','KUMARI', 'PRABHU', 'CITIZENS', 'CBL',
  'MEGA', 'MEGABANK', 'Prime_Alert', 'MissedCall',  'STOCKALERT','LAXMI', 'SIDDHARTHA', 'SBL',
  'EVEREST', 'EBL', 'MACHHAPUCHCHHRE', 'MBL', 'JANATA',
  'RASTRIYA', 'RBB', 'AGRBANK', 'ADBL', 'GLOBAL', 'IME',
  'SUNRISE', 'CENTURY', 'MUKTINATH', 'MITERI', 'SHINE',
  'NCELL', 'NTC', 'NTCELL', 'NTLIMITED', 'SMARTCELL',
  'ESEWA', 'KHALTI', 'FONEPAY', 'IMEPAY', 'CONNECTIPS',
  'GOVNEPAL', 'NRB', 'NEPALRASTRA',
];

// ── Missed call message patterns — NEVER analyze these ────────────────────
// Carriers send SMS notifications for missed calls — we must skip them
const MISSED_CALL_PATTERNS = [
  /missed\s*call/i,
  /miss.*call/i,
  /you\s+have\s+a\s+missed/i,
  /missed\s+a\s+call/i,
  /called\s+you/i,
  /tried\s+to\s+reach/i,
  /छुटेको\s*कल/i,          // Nepali: missed call
  /missed\s*call\s*from/i,
  /you\s+missed\s+a\s+call/i,
  /voicemail/i,
  /voice\s*mail/i,
];

export const isMissedCallMessage = (body) => {
  if (!body) return false;
  return MISSED_CALL_PATTERNS.some((pattern) => pattern.test(body));
};

export const isTrustedSender = (address) => {
  if (!address) return false;
  // Pure number — never trusted by name
  if (/^\+?\d+$/.test(address.trim())) return false;
  const upper = address.toUpperCase().replace(/[-_\s.]/g, '');
  return TRUSTED_SENDERS.some((t) => upper.includes(t.replace(/[-_]/g, '')));
};

// ── Normalize raw SMS object ───────────────────────────────────────────────
const normalizeMessage = (raw) => ({
  _id:     String(raw._id || raw.id || Math.random().toString(36).substr(2, 9)),
  address: raw.address || 'Unknown',
  body:    raw.body || raw.msg || '',
  date:    raw.date ? parseInt(raw.date) : Date.now(),
  read:    raw.read === '1' || raw.read === 1,
  type:    raw.type,
});

// ── Request SMS Permission ─────────────────────────────────────────────────
export const requestSmsPermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'MeroSuraksha SMS Access',
        message:
          'MeroSuraksha needs to read your SMS inbox to detect scam messages. ' +
          'Bank and telecom messages are automatically excluded.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    const result = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('[SMS] Permission granted:', result);
    return result;
  } catch (e) {
    console.log('[SMS] Permission error:', e.message);
    return false;
  }
};

// ── Request Call Log Permission ────────────────────────────────────────────
export const requestCallLogPermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'MeroSuraksha Call Log Access',
        message: 'To identify spam callers, MeroSuraksha needs access to your call log.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
};

// ── Read real SMS on Android ───────────────────────────────────────────────
const readRealSms = () => {
  return new Promise((resolve) => {
    try {
      const smsModule = require('react-native-get-sms-android');
      const SmsAndroid = smsModule.default || smsModule;

      console.log('[SMS] Module loaded successfully');

      if (typeof SmsAndroid.list !== 'function') {
        console.log('[SMS] ERROR: list() method not found on module');
        resolve([]);
        return;
      }

      const filter = JSON.stringify({
        box:       'inbox',
        maxCount:  200,
        indexFrom: 0,
      });

      SmsAndroid.list(
        filter,
        (fail) => {
          console.log('[SMS] FAILED to read:', fail);
          resolve([]);
        },
        (count, smsList) => {
          console.log('[SMS] Raw count from Android:', count);
          try {
            const parsed = JSON.parse(smsList);
            console.log('[SMS] Parsed messages:', parsed.length);

            // Filter out trusted senders AND missed call messages
            const filtered = parsed.filter((m) => {
              if (isTrustedSender(m.address)) return false;
              if (isMissedCallMessage(m.body || m.msg || '')) {
                console.log(`[SMS] Skipping missed call message from: ${m.address}`);
                return false;
              }
              return true;
            });

            console.log('[SMS] After trusted + missed-call filter:', filtered.length, 'messages');
            resolve(filtered.map(normalizeMessage));
          } catch (parseError) {
            console.log('[SMS] Parse error:', parseError.message);
            resolve([]);
          }
        }
      );
    } catch (e) {
      console.log('[SMS] Module require error:', e.message);
      resolve([]);
    }
  });
};

// ── Main export ────────────────────────────────────────────────────────────
export const readSmsMessages = async () => {
  console.log('[SMS] readSmsMessages called, platform:', Platform.OS);

  if (Platform.OS !== 'android') {
    console.log('[SMS] Not Android — returning empty (no mock)');
    return [];
  }

  const granted = await requestSmsPermission();
  if (!granted) {
    console.log('[SMS] Permission DENIED — cannot read SMS');
    return [];
  }

  console.log('[SMS] Permission granted, reading real SMS...');
  const messages = await readRealSms();
  console.log('[SMS] Final message count:', messages.length);

  return messages;
};

// ── Formatting helpers ─────────────────────────────────────────────────────
export const formatSender = (address) => {
  if (!address) return 'Unknown';
  const clean = address.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 7)}-${clean.slice(7)}`;
  }
  return address;
};

export const getRiskColor = (level) => {
  const map = {
    high:    '#EF4444',
    medium:  '#F59E0B',
    low:     '#10B981',
    unknown: '#94A3B8',
  };
  return map[level] || map.unknown;
};

export const getRiskLabel = (level) => {
  const map = {
    high:    'High Risk',
    medium:  'Medium Risk',
    low:     'Low Risk',
    unknown: 'Unknown',
  };
  return map[level] || map.unknown;
};

export const getRiskIcon = (level) => {
  const map = {
    high:    'alert-circle',
    medium:  'warning',
    low:     'checkmark-circle',
    unknown: 'help-circle',
  };
  return map[level] || map.unknown;
};