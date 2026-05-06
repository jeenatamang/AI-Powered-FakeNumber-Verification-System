// src/services/callDetectionService.js
import { Platform, NativeModules, NativeEventEmitter, 
         PermissionsAndroid } from 'react-native';

// ── Request phone state permission ─────────────────────────────────────────
export const requestPhonePermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: 'MeroSuraksha Phone Access',
        message:
          'MeroSuraksha needs phone state access to warn you about ' +
          'spam callers while your phone is ringing.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.log('Phone permission error:', e);
    return false;
  }
};

// ── Read call log safely ───────────────────────────────────────────────────
export const readCallLog = async () => {
  try {
    const mod = await import('react-native-call-log');
    const CallLog = mod.default || mod;
    const calls = await CallLog.loadAll();

    return calls.slice(0, 50).map((call, index) => ({
      _id: String(call.timestamp || index),
      address: call.phoneNumber || 'Unknown',
      duration: parseInt(call.duration) || 0,
      date: call.timestamp ? parseInt(call.timestamp) : Date.now(),
      type: call.type || 'INCOMING',
      name: call.name || null,
    }));
  } catch (e) {
    console.log('Call log read error:', e.message);
    return [];
  }
};

// ── Request call log permission ────────────────────────────────────────────
export const requestCallLogPermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'MeroSuraksha Call Log Access',
        message:
          'MeroSuraksha needs access to your call log to identify spam callers.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
};