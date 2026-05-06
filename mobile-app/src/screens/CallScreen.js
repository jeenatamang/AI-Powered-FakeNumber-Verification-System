// mobile-app/src/screens/CallScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, FlatList,
  ActivityIndicator, Platform, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { numberAPI, cacheAPI } from '../api/api';
import {
  formatSender, getRiskColor,
  getRiskLabel, getRiskIcon,
} from '../services/smsService';
import {
  readCallLog,
  requestCallLogPermission,
  requestPhonePermission,
} from '../services/callDetectionService';

const COLORS = {
  bg: '#F0F4FF', dark: '#202940', white: '#FFFFFF',
  accent: '#3B6FE8', sub: '#6B7280',
};

// ── Helpers ────────────────────────────────────────────────────────────────
const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = num.replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
};

const getCallTypeLabel = (type) => {
  if (type === 'MISSED'   || type === '3') return 'Missed';
  if (type === 'OUTGOING' || type === '2') return 'Outgoing';
  return 'Incoming';
};

const getCallTypeColor = (type) => {
  if (type === 'MISSED'   || type === '3') return '#EF4444';
  if (type === 'OUTGOING' || type === '2') return '#3B6FE8';
  return '#10B981';
};

const formatDuration = (sec) => {
  if (!sec || sec === 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? ` · ${m}m ${s}s` : ` · ${s}s`;
};

const formatDate = (timestamp) => {
  const date  = new Date(timestamp);
  const now   = new Date();
  const diffH = (now - date) / 3600000;
  if (diffH < 24) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// ── Risk Modal ─────────────────────────────────────────────────────────────
const RiskModal = ({ visible, call, onClose }) => {
  const [riskData,    setRiskData]    = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  useEffect(() => {
    if (!visible || !call) { setRiskData(null); return; }
    const fetchRisk = async () => {
      setLoadingRisk(true);
      setRiskData(null);
      try {
        const cleaned = cleanNumber(call.address);
        if (cleaned.length >= 7) {
          const res = await numberAPI.lookupNumber(cleaned);
          setRiskData(res.data?.result || null);
        }
      } catch (e) {
        console.log('[Modal] Risk lookup error:', e.message);
      } finally {
        setLoadingRisk(false);
      }
    };
    fetchRisk();
  }, [visible, call]);

  if (!call) return null;
  const risk      = riskData?.riskLevel || 'unknown';
  const riskColor = getRiskColor(risk);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={[styles.modalHeader, { backgroundColor: riskColor + '15' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.sub} />
            </TouchableOpacity>
            {loadingRisk ? (
              <ActivityIndicator size="large" color={riskColor} style={{ marginTop: 8 }} />
            ) : (
              <Ionicons name={getRiskIcon(risk)} size={44} color={riskColor} />
            )}
            <Text style={[styles.modalRiskLabel, { color: riskColor }]}>
              {loadingRisk ? 'Checking...' : getRiskLabel(risk)}
            </Text>
            <Text style={styles.modalNumber}>{call.name || formatSender(call.address)}</Text>
            {call.name && <Text style={styles.modalRawNumber}>{call.address}</Text>}
          </View>

          <View style={styles.modalStats}>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatNum}>{loadingRisk ? '—' : (riskData?.spamCount ?? 0)}</Text>
              <Text style={styles.modalStatLabel}>Spam Reports</Text>
            </View>
            <View style={styles.modalStatDivider} />
            <View style={styles.modalStat}>
              <Text style={styles.modalStatNum}>{loadingRisk ? '—' : (riskData?.reportCount ?? 0)}</Text>
              <Text style={styles.modalStatLabel}>User Reports</Text>
            </View>
            <View style={styles.modalStatDivider} />
            <View style={styles.modalStat}>
              <Text style={styles.modalStatNum}>{loadingRisk ? '—' : (riskData?.uniqueVictimCount ?? 0)}</Text>
              <Text style={styles.modalStatLabel}>Victims</Text>
            </View>
          </View>

          <View style={styles.modalInfo}>
            <View style={styles.modalInfoRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.sub} />
              <Text style={styles.modalInfoText}>
                {getCallTypeLabel(call.type)}{formatDuration(call.duration)}
              </Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.sub} />
              <Text style={styles.modalInfoText}>
                {new Date(call.date).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            {riskData?.number && (
              <View style={styles.modalInfoRow}>
                <Ionicons name="call" size={16} color={COLORS.sub} />
                <Text style={styles.modalInfoText}>Stored as: {riskData.number}</Text>
              </View>
            )}
          </View>

          {!loadingRisk && (risk === 'high' || risk === 'medium') && (
            <View style={[styles.modalWarning, { backgroundColor: riskColor + '15' }]}>
              <Ionicons name="warning" size={16} color={riskColor} style={{ marginRight: 8 }} />
              <Text style={[styles.modalWarningText, { color: riskColor }]}>
                {risk === 'high'
                  ? 'Confirmed spam. Do not call back or share personal info.'
                  : 'Flagged as suspicious by community reports.'}
              </Text>
            </View>
          )}
          {!loadingRisk && risk === 'unknown' && (
            <View style={[styles.modalWarning, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="information-circle" size={16} color={COLORS.sub} style={{ marginRight: 8 }} />
              <Text style={[styles.modalWarningText, { color: COLORS.sub }]}>
                No reports found for this number in our database.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────
export default function CallScreen() {
  const [calls,         setCalls]         = useState([]);
  const [riskMap,       setRiskMap]       = useState({});
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [permDenied,    setPermDenied]    = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [checkingNew,   setCheckingNew]   = useState(false);
  const [newCallsFound, setNewCallsFound] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const autoRefreshRef  = useRef(null);
  const lastTimestampRef = useRef(0); // tracks the latest call date we've seen

  // ── Initial load: use DB cache + only risk-check new calls ────────────
  const initialLoad = useCallback(async () => {
    setLoading(true);

    if (Platform.OS === 'android') {
      const granted = await requestCallLogPermission();
      await requestPhonePermission();
      if (!granted) {
        setPermDenied(true);
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Get last known timestamp from server
      const tsRes       = await cacheAPI.getLastCallTimestamp();
      const lastTs      = tsRes.data?.lastTimestamp || 0;
      lastTimestampRef.current = lastTs;

      // 2. Load ALL cached calls from DB — show them immediately
      const cachedRes   = await cacheAPI.getCachedCalls();
      const cachedCalls = cachedRes.data.data || [];
      const cachedIdMap = {};
      const initRisk    = {};

      cachedCalls.forEach((c) => {
        cachedIdMap[c.callId] = c;
        initRisk[c.callId]    = c.riskLevel || 'unknown';
      });

      // 3. Read from phone to merge (DB is source of truth for display)
      const phoneCalls = await readCallLog();
      console.log(`[Calls] Phone: ${phoneCalls.length} | DB: ${cachedCalls.length}`);

      // 4. Find calls NOT in DB yet (new since last sync)
      const newCalls = phoneCalls.filter((c) => !cachedIdMap[String(c._id)]);
      console.log(`[Calls] New since last sync: ${newCalls.length}`);

      // 5. Apply cached risk to phone call list
      phoneCalls.forEach((c) => {
        const cached = cachedIdMap[String(c._id)];
        if (cached) initRisk[String(c._id)] = cached.riskLevel || 'unknown';
      });

      setCalls(phoneCalls);
      setRiskMap(initRisk);
      setLoading(false);
      setLastRefreshed(new Date());

      // Update last known timestamp
      if (phoneCalls.length > 0) {
        const maxTs = Math.max(...phoneCalls.map((c) => c.date || 0));
        lastTimestampRef.current = Math.max(lastTimestampRef.current, maxTs);
      }

      // 6. Save new calls and check their risk (only new ones)
      if (newCalls.length > 0) {
        await cacheAPI.saveCalls(newCalls);
        checkRiskBadges(newCalls, true);
      }

    } catch (e) {
      console.log('[Calls] Load error:', e.message);
      const phoneCalls = await readCallLog();
      setCalls(phoneCalls);
      setLoading(false);
      setLastRefreshed(new Date());
      checkRiskBadges(phoneCalls, false);
    }
  }, []);

  // ── Check new calls only (since last refresh) ─────────────────────────
  const checkForNewCalls = useCallback(async () => {
    if (checkingNew) return;
    setCheckingNew(true);
    setNewCallsFound(0);

    try {
      const phoneCalls = await readCallLog();
      const cachedRes  = await cacheAPI.getCachedCalls();
      const cachedIds  = new Set((cachedRes.data.data || []).map((c) => c.callId));

      const newCalls = phoneCalls.filter((c) => !cachedIds.has(String(c._id)));
      console.log(`[Calls] Check for new: found ${newCalls.length} new call(s)`);

      if (newCalls.length > 0) {
        setNewCallsFound(newCalls.length);
        await cacheAPI.saveCalls(newCalls);
        setCalls(phoneCalls);
        checkRiskBadges(newCalls, true);
      }

      setLastRefreshed(new Date());
    } catch (e) {
      console.log('[Calls] Check new error:', e.message);
    } finally {
      setCheckingNew(false);
    }
  }, [checkingNew]);

  // ── Check risk level badges (only for given calls) ─────────────────────
  const checkRiskBadges = async (log, saveToDb = false) => {
    for (const call of log) {
      const cleaned = cleanNumber(call.address);
      if (!cleaned || cleaned.length < 7) {
        setRiskMap((prev) => ({ ...prev, [String(call._id)]: 'unknown' }));
        continue;
      }
      try {
        const res  = await numberAPI.lookupNumber(cleaned);
        const risk = res.data?.result?.riskLevel || 'unknown';
        setRiskMap((prev) => ({ ...prev, [String(call._id)]: risk }));
        if (saveToDb && risk !== 'unknown') {
          cacheAPI.updateCallRisk(String(call._id), risk).catch(() => {});
        }
      } catch {
        setRiskMap((prev) => ({ ...prev, [String(call._id)]: 'unknown' }));
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  };

  useEffect(() => {
    initialLoad();

    // Auto-check every 30s — but only saves/checks NEW calls
    autoRefreshRef.current = setInterval(async () => {
      try {
        const phoneCalls = await readCallLog();
        const cachedRes  = await cacheAPI.getCachedCalls();
        const cachedIds  = new Set((cachedRes.data.data || []).map((c) => c.callId));
        const newCalls   = phoneCalls.filter((c) => !cachedIds.has(String(c._id)));

        if (newCalls.length > 0) {
          console.log(`[Calls] Auto: ${newCalls.length} new call(s)`);
          await cacheAPI.saveCalls(newCalls);
          setCalls(phoneCalls);
          checkRiskBadges(newCalls, true);
        }
      } catch (e) {
        console.log('[Calls] Auto-refresh error:', e.message);
      }
    }, 30000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [initialLoad]);

  // ── Pull-to-refresh — full reload ─────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    setRiskMap({});
    await initialLoad();
    setRefreshing(false);
  };

  // ── Format last refreshed time ─────────────────────────────────────────
  const getLastRefreshedText = () => {
    if (!lastRefreshed) return '';
    const now   = new Date();
    const diffM = Math.floor((now - lastRefreshed) / 60000);
    if (diffM < 1) return 'just now';
    if (diffM === 1) return '1 min ago';
    return `${diffM} mins ago`;
  };

  // ── Render call row ────────────────────────────────────────────────────
  const renderCall = useCallback(({ item }) => {
    const id        = String(item._id);
    const risk      = riskMap[id];
    const riskColor = getRiskColor(risk || 'unknown');
    const isHighRisk = risk === 'high';
    const isMedRisk  = risk === 'medium';
    const isSpam     = isHighRisk || isMedRisk;
    const isMissed   = item.type === 'MISSED' || item.type === '3';
    const typeColor  = getCallTypeColor(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.callCard,
          isSpam && { borderLeftWidth: 4, borderLeftColor: riskColor },
        ]}
        onPress={() => setSelected(item)}
        activeOpacity={0.75}
      >
        <View style={[
          styles.callAvatar,
          { backgroundColor: isSpam ? riskColor + '20' : typeColor + '15' },
        ]}>
          <Ionicons
            name={isSpam ? getRiskIcon(risk) : 'person'}
            size={22}
            color={isSpam ? riskColor : typeColor}
          />
        </View>

        <View style={styles.callInfo}>
          <View style={styles.callTop}>
            <Text style={[
              styles.callName,
              isSpam   && { color: riskColor },
              isMissed && !isSpam && { color: '#EF4444' },
            ]} numberOfLines={1}>
              {item.name || formatSender(item.address)}
            </Text>
            <Text style={styles.callDate}>{formatDate(item.date)}</Text>
          </View>

          {item.name && <Text style={styles.callNumber}>{item.address}</Text>}

          <View style={styles.callBottom}>
            <Ionicons name="call" size={13} color={typeColor} />
            <Text style={[styles.callMeta, { color: typeColor }]}>
              {' '}{getCallTypeLabel(item.type)}{formatDuration(item.duration)}
            </Text>

            {risk === undefined ? (
              <View style={styles.checkingBadge}>
                <ActivityIndicator size={8} color="#CBD5E1" style={{ marginRight: 3 }} />
                <Text style={styles.checkingText}>Checking...</Text>
              </View>
            ) : risk !== 'unknown' ? (
              <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
                <Ionicons name={getRiskIcon(risk)} size={10} color={riskColor} style={{ marginRight: 3 }} />
                <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                  {getRiskLabel(risk)}
                </Text>
              </View>
            ) : null}
          </View>

          {isSpam && (
            <View style={[styles.spamStrip, { backgroundColor: riskColor + '12' }]}>
              <Ionicons name="warning-outline" size={11} color={riskColor} style={{ marginRight: 4 }} />
              <Text style={[styles.spamStripText, { color: riskColor }]}>
                {isHighRisk ? 'HIGH RISK — confirmed spam number' : 'Suspicious — flagged by community'}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ alignSelf: 'center' }} />
      </TouchableOpacity>
    );
  }, [riskMap]);

  // ── Permission denied ──────────────────────────────────────────────────
  if (permDenied) {
    return (
      <SafeArea style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recent Calls</Text>
        </View>
        <View style={[styles.body, styles.center]}>
          <Ionicons name="lock-closed-outline" size={56} color="#CBD5E1" />
          <Text style={styles.permTitle}>Call Log Permission Required</Text>
          <Text style={styles.permSub}>
            Settings → Apps → MeroSuraksha → Permissions → Enable Call Log
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (loading) {
    return (
      <SafeArea style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recent Calls</Text>
          <Text style={styles.headerSub}>Loading call history...</Text>
        </View>
        <View style={[styles.body, styles.center]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={{ color: COLORS.sub, marginTop: 12 }}>Loading from cache...</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recent Calls</Text>
          <Text style={styles.headerSub}>
            {calls.length} calls · Updated {getLastRefreshedText()}
          </Text>
        </View>
        {/* "Check for new calls" button */}
        <TouchableOpacity
          style={[styles.checkBtn, checkingNew && styles.checkBtnDisabled]}
          onPress={checkForNewCalls}
          disabled={checkingNew}
        >
          {checkingNew ? (
            <ActivityIndicator size={14} color={COLORS.accent} style={{ marginRight: 5 }} />
          ) : (
            <Ionicons name="refresh" size={14} color={COLORS.accent} style={{ marginRight: 5 }} />
          )}
          <Text style={styles.checkBtnText}>
            {checkingNew ? 'Checking...' : 'Check New'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* New calls found banner */}
      {newCallsFound > 0 && (
        <View style={styles.newBanner}>
          <Ionicons name="call" size={14} color="#065F46" style={{ marginRight: 6 }} />
          <Text style={styles.newBannerText}>
            {newCallsFound} new call{newCallsFound > 1 ? 's' : ''} added
          </Text>
          <TouchableOpacity onPress={() => setNewCallsFound(0)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={14} color="#065F46" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        style={styles.body}
        data={calls}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderCall}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="call-outline" size={48} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 15 }}>No calls found</Text>
          </View>
        }
      />

      <RiskModal
        visible={!!selected}
        call={selected}
        onClose={() => setSelected(null)}
      />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.dark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub:   { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  body: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  center: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 32,
  },
  // ── "Check New" button ──
  checkBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  checkBtnDisabled: { opacity: 0.6 },
  checkBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  // ── New calls banner ──
  newBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', marginHorizontal: 16,
    marginBottom: 8, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  newBannerText: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  // ── Call card ──
  callCard: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 14, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    alignItems: 'flex-start',
  },
  callAvatar: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  callInfo:   { flex: 1 },
  callTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  callName:   { fontSize: 15, fontWeight: '700', color: COLORS.dark, flex: 1 },
  callNumber: { fontSize: 11, color: COLORS.sub, marginBottom: 4 },
  callDate:   { fontSize: 11, color: COLORS.sub },
  callBottom: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 4, marginBottom: 6, flexWrap: 'wrap',
  },
  callMeta:      { fontSize: 12 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginLeft: 8,
  },
  riskBadgeText:  { fontSize: 10, fontWeight: '700' },
  checkingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 20, marginLeft: 8,
  },
  checkingText:  { fontSize: 10, color: '#CBD5E1' },
  spamStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  spamStripText: { fontSize: 11, fontWeight: '600' },
  permTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.dark,
    marginTop: 16, textAlign: 'center',
  },
  permSub: {
    fontSize: 13, color: COLORS.sub, marginTop: 8,
    textAlign: 'center', lineHeight: 20,
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(32,41,64,0.75)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center', paddingTop: 36,
    paddingBottom: 20, paddingHorizontal: 20, position: 'relative',
  },
  modalClose:       { position: 'absolute', top: 16, right: 16, padding: 4 },
  modalRiskLabel:   { fontSize: 20, fontWeight: '800', marginTop: 8 },
  modalNumber:      { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginTop: 4 },
  modalRawNumber:   { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  modalStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 20, borderBottomWidth: 1,
    borderColor: '#F1F5F9', marginHorizontal: 20,
  },
  modalStat:        { alignItems: 'center' },
  modalStatNum:     { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  modalStatLabel:   { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  modalStatDivider: { width: 1, backgroundColor: '#E2E8F0' },
  modalInfo:        { padding: 20, paddingBottom: 8 },
  modalInfoRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalInfoText:    { fontSize: 14, color: COLORS.sub, marginLeft: 10 },
  modalWarning: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 20, marginBottom: 16,
    padding: 12, borderRadius: 12,
  },
  modalWarningText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  modalBtn: {
    margin: 20, marginTop: 4, backgroundColor: COLORS.dark,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  modalBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});