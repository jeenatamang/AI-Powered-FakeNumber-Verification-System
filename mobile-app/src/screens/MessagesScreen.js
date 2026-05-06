// mobile-app/src/screens/MessagesScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, Modal,
  Alert, RefreshControl, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { smsAPI, numberAPI, cacheAPI } from '../api/api';
import {
  readSmsMessages, formatSender,
  getRiskColor, getRiskLabel, getRiskIcon,
} from '../services/smsService';

const COLORS = {
  bg: '#F0F4FF', dark: '#202940', white: '#FFFFFF',
  accent: '#3B6FE8', sub: '#6B7280', border: '#E2E8F0',
};

// ── ADDED waiting_verification category ───────────────────────────────────
const CAT = {
  spam:                 { color: '#EF4444', bg: '#FEF2F2', label: 'Spam',                 icon: 'alert-circle' },
  ham:                  { color: '#10B981', bg: '#ECFDF5', label: 'Safe',                 icon: 'checkmark-circle' },
  uncertain:            { color: '#F59E0B', bg: '#FFFBEB', label: 'Review',               icon: 'warning' },
  waiting_verification: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Waiting Verification', icon: 'hourglass-outline' },
  loading:              { color: '#CBD5E1', bg: '#F8FAFC', label: 'Scanning',             icon: 'time-outline' },
};

// ── Strip country code ─────────────────────────────────────────────────────
const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) cleaned = cleaned.slice(3);
  return cleaned;
};

export default function MessagesScreen() {
  const [messages,        setMessages]       = useState([]);
  const [classifications, setClassif]        = useState({});
  const [riskLevels,      setRiskLevels]     = useState({});
  const [loading,         setLoading]        = useState(true);
  const [refreshing,      setRefreshing]     = useState(false);
  const [selected,        setSelected]       = useState(null);
  const [filter,          setFilter]         = useState('all');
  const [search,          setSearch]         = useState('');
  const [permDenied,      setPermDenied]     = useState(false);
  const [isAnalyzing,     setIsAnalyzing]    = useState(false);
  const [analyzingCount,  setAnalyzingCount] = useState(0);
  const [checkingNew,     setCheckingNew]    = useState(false);
  const [newMsgsFound,    setNewMsgsFound]   = useState(0);
  const [lastRefreshed,   setLastRefreshed]  = useState(null);

  const classifBatch = useRef({});
  const riskBatch    = useRef({});
  const batchTimer   = useRef(null);
  const analyzingRef = useRef(false);

  // ── Batch flush ────────────────────────────────────────────────────────
  const flushBatch = useCallback(() => {
    if (Object.keys(classifBatch.current).length > 0) {
      setClassif((prev) => ({ ...prev, ...classifBatch.current }));
      classifBatch.current = {};
    }
    if (Object.keys(riskBatch.current).length > 0) {
      setRiskLevels((prev) => ({ ...prev, ...riskBatch.current }));
      riskBatch.current = {};
    }
  }, []);

  const scheduleBatchFlush = useCallback(() => {
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(flushBatch, 800);
  }, [flushBatch]);

  // ── MAIN LOAD ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const cachedRes  = await cacheAPI.getCachedMessages();
      const cachedList = cachedRes.data.data || [];
      console.log(`[MSG] DB has ${cachedList.length} cached messages`);

      const dbLabelMap = {};
      cachedList.forEach((m) => { dbLabelMap[m.messageId] = m.label; });

      const phoneMsgs = await readSmsMessages();
      console.log(`[MSG] Phone has ${phoneMsgs.length} messages`);

      if (phoneMsgs.length === 0 && Platform.OS === 'android') {
        setPermDenied(true);
        setLoading(false);
        return;
      }

      const initClassif = {};
      phoneMsgs.forEach((msg) => {
        const key = String(msg._id);
        if (dbLabelMap[key]) initClassif[key] = dbLabelMap[key];
      });

      setMessages(phoneMsgs);
      setClassif(initClassif);
      setLoading(false);
      setLastRefreshed(new Date());

      const cachedIds = new Set(Object.keys(dbLabelMap));
      const newMsgs   = phoneMsgs.filter((m) => !cachedIds.has(String(m._id)));
      console.log(`[MSG] ${newMsgs.length} new messages need AI`);

      if (newMsgs.length === 0) {
        console.log('[MSG] All messages already analyzed. Done.');
        return;
      }

      try {
        await cacheAPI.saveMessages(newMsgs);
        console.log(`[MSG] Saved ${newMsgs.length} new messages to DB`);
      } catch (e) {
        console.log('[MSG] Save error:', e.message);
      }

      analyzeNewMessages(newMsgs);

    } catch (e) {
      console.log('[MSG] Load error, falling back:', e.message);
      const phoneMsgs = await readSmsMessages();
      setMessages(phoneMsgs);
      setLoading(false);
      setLastRefreshed(new Date());
      analyzeNewMessages(phoneMsgs);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
      analyzingRef.current = false;
    };
  }, [loadMessages]);

  // ── POLL for admin decisions on waiting_verification messages ──────────
  // Every 30s, re-fetch DB labels and update any that changed from
  // waiting_verification → spam or ham (meaning admin has decided)
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        // Check if any messages are currently waiting_verification
        setClassif((prev) => {
          const waitingKeys = Object.keys(prev).filter(
            (k) => prev[k] === 'waiting_verification'
          );
          if (waitingKeys.length === 0) return prev; // nothing to poll
          return prev; // keep state, trigger the async fetch below
        });

        // Fetch fresh labels from DB
        const cachedRes  = await cacheAPI.getCachedMessages();
        const cachedList = cachedRes.data.data || [];
        const freshMap   = {};
        cachedList.forEach((m) => { freshMap[m.messageId] = m.label; });

        // Update only messages that were waiting_verification and now changed
        setClassif((prev) => {
          const updates = {};
          let hasChanges = false;
          Object.keys(prev).forEach((key) => {
            if (
              prev[key] === 'waiting_verification' &&
              freshMap[key] &&
              freshMap[key] !== 'waiting_verification'
            ) {
              updates[key] = freshMap[key];
              hasChanges = true;
              console.log(`[MSG] Admin decided ${key} → ${freshMap[key]}`);
            }
          });
          if (!hasChanges) return prev;
          return { ...prev, ...updates };
        });
      } catch (e) {
        // Silent fail — polling is best-effort
      }
    }, 30000); // poll every 30 seconds

    return () => clearInterval(poll);
  }, []);

  // ── Check for new messages ─────────────────────────────────────────────
  const checkForNewMessages = useCallback(async () => {
    if (checkingNew || analyzingRef.current) return;
    setCheckingNew(true);
    setNewMsgsFound(0);

    try {
      const cachedRes  = await cacheAPI.getCachedMessages();
      const cachedList = cachedRes.data.data || [];
      const cachedIds  = new Set(cachedList.map((m) => m.messageId));

      // Also pick up any admin decisions while we're here
      const freshMap = {};
      cachedList.forEach((m) => { freshMap[m.messageId] = m.label; });
      setClassif((prev) => {
        const updates = {};
        let hasChanges = false;
        Object.keys(prev).forEach((key) => {
          if (
            prev[key] === 'waiting_verification' &&
            freshMap[key] &&
            freshMap[key] !== 'waiting_verification'
          ) {
            updates[key] = freshMap[key];
            hasChanges = true;
          }
        });
        if (!hasChanges) return prev;
        return { ...prev, ...updates };
      });

      const phoneMsgs = await readSmsMessages();
      const newMsgs   = phoneMsgs.filter((m) => !cachedIds.has(String(m._id)));

      console.log(`[MSG] Check new: found ${newMsgs.length} new message(s)`);

      if (newMsgs.length > 0) {
        setNewMsgsFound(newMsgs.length);

        const loadingPatch = {};
        newMsgs.forEach((m) => { loadingPatch[String(m._id)] = undefined; });
        setClassif((prev) => ({ ...prev, ...loadingPatch }));

        setMessages(phoneMsgs);
        await cacheAPI.saveMessages(newMsgs);
        analyzeNewMessages(newMsgs);
      }

      setLastRefreshed(new Date());
    } catch (e) {
      console.log('[MSG] Check new error:', e.message);
    } finally {
      setCheckingNew(false);
    }
  }, [checkingNew]);

  // ── AI analysis ────────────────────────────────────────────────────────
  const analyzeNewMessages = async (msgs) => {
    if (analyzingRef.current) return;
    if (msgs.length === 0) return;

    analyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalyzingCount(msgs.length);

    for (const msg of msgs) {
      if (!analyzingRef.current) break;
      const key = String(msg._id);

      try {
        if (msg.address) {
          const localNum = cleanNumber(msg.address);
          if (localNum.length >= 7) {
            numberAPI.lookupNumber(localNum)
              .then((res) => {
                const risk = res.data?.result?.riskLevel || 'unknown';
                if (risk !== 'unknown') {
                  riskBatch.current[key] = risk;
                  scheduleBatchFlush();
                }
              })
              .catch(() => {});
          }
        }

        const res        = await smsAPI.analyzeMessage(msg.body, msg.address);
        const result     = res.data?.result;
        const label      = result?.label          || 'ham';
        const confidence = result?.confidence     || 0;
        const classif    = result?.classification || '';

        classifBatch.current[key] = label;
        scheduleBatchFlush();

        try {
          await cacheAPI.updateMessageLabel(key, label, confidence, classif);
          console.log(`[MSG] Saved label ${label} for ${key}`);
        } catch (e) {
          console.log(`[MSG] Label save error for ${key}:`, e.message);
        }

      } catch (err) {
        classifBatch.current[key] = 'uncertain';
        scheduleBatchFlush();
        console.log(`[MSG] AI error for ${key}:`, err.message);
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    flushBatch();
    analyzingRef.current = false;
    setIsAnalyzing(false);
    setAnalyzingCount(0);
  };

  // ── Pull to refresh ────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    analyzingRef.current = false;
    classifBatch.current = {};
    riskBatch.current    = {};
    await loadMessages();
    setRefreshing(false);
  };

  // ── Report spam — sets waiting_verification, NOT spam directly ─────────
  // CHANGED: label is now 'waiting_verification' until admin confirms
  const reportSpam = async (msg) => {
    try {
      const key     = String(msg._id);
      const cleaned = cleanNumber(msg.address);

      // CHANGED: pass messageId so backend can link CachedMessage
      await smsAPI.reportMessage(cleaned, msg.body, key);

      // CHANGED: set label to waiting_verification, NOT spam
      classifBatch.current[key] = 'waiting_verification';
      flushBatch();

      // Save to DB as waiting_verification
      try {
        await cacheAPI.saveMessages([msg]);
        await cacheAPI.updateMessageLabel(key, 'waiting_verification', 1, 'user_reported');
        console.log(`[MSG] User reported spam, now waiting_verification for ${key}`);
      } catch (e) {
        console.log('[MSG] Label save error:', e.message);
      }

      setSelected(null);
      Alert.alert(
        'Report Submitted',
        'Your report has been submitted for admin review. The label will update once verified.',
      );
    } catch (e) {
      Alert.alert('Error', 'Could not submit report. Try again.');
    }
  };

  // ── Mark not spam ──────────────────────────────────────────────────────
  const markNotSpam = async (key, msg) => {
    classifBatch.current[key] = 'ham';
    flushBatch();
    try {
      if (msg) await cacheAPI.saveMessages([msg]);
      await cacheAPI.updateMessageLabel(key, 'ham', 0, 'not spam');
      console.log(`[MSG] User marked ham for ${key}`);
    } catch (e) {
      console.log('[MSG] Label save error:', e.message);
    }
    setSelected(null);
    Alert.alert('Updated', 'This message has been marked as safe.');
  };

  // ── Format last refreshed ──────────────────────────────────────────────
  const getLastRefreshedText = () => {
    if (!lastRefreshed) return '';
    const diffM = Math.floor((new Date() - lastRefreshed) / 60000);
    if (diffM < 1) return 'just now';
    if (diffM === 1) return '1 min ago';
    return `${diffM} mins ago`;
  };

  // ── Filtered list ──────────────────────────────────────────────────────
  const displayMessages = messages.filter((msg) => {
    const cat = classifications[String(msg._id)] || 'loading';
    const matchesFilter =
      filter === 'all'    ? true :
      // CHANGED: spam filter also shows waiting_verification
      filter === 'spam'   ? (cat === 'spam' || cat === 'waiting_verification') :
      filter === 'safe'   ? cat === 'ham' :
      filter === 'review' ? cat === 'uncertain' : true;
    const matchesSearch =
      !search.trim() ? true :
      msg.address?.includes(search) ||
      msg.body?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ── Render message row ─────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    const key      = String(item._id);
    const cat      = classifications[key] || 'loading';
    const risk     = riskLevels[key];
    const cfg      = CAT[cat] || CAT.loading;
    const isSpam   = cat === 'spam';
    const isWaiting = cat === 'waiting_verification';
    const riskColor = risk ? getRiskColor(risk) : null;

    return (
      <TouchableOpacity
        style={[
          styles.msgCard,
          isSpam    && styles.msgCardSpam,
          isWaiting && styles.msgCardWaiting,
        ]}
        onPress={() => setSelected(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.avatar, {
          backgroundColor: isSpam ? '#FEE2E2' : isWaiting ? '#EDE9FE' : '#EEF2FF',
        }]}>
          <Ionicons
            name={isSpam ? 'warning' : isWaiting ? 'hourglass-outline' : 'person'}
            size={20}
            color={isSpam ? '#EF4444' : isWaiting ? '#8B5CF6' : '#3B6FE8'}
          />
        </View>

        <View style={styles.msgContent}>
          <View style={styles.msgTop}>
            <Text
              style={[
                styles.sender,
                isSpam    && { color: '#EF4444' },
                isWaiting && { color: '#8B5CF6' },
              ]}
              numberOfLines={1}
            >
              {formatSender(item.address)}
            </Text>
            <Text style={styles.msgTime}>
              {new Date(item.date).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short',
              })}
            </Text>
          </View>
          <Text style={styles.msgBody} numberOfLines={2}>{item.body}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={10} color={cfg.color} style={{ marginRight: 3 }} />
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {risk && risk !== 'unknown' && (
              <View style={[styles.badge, { backgroundColor: riskColor + '20', marginLeft: 6 }]}>
                <Ionicons name={getRiskIcon(risk)} size={10} color={riskColor} style={{ marginRight: 3 }} />
                <Text style={[styles.badgeText, { color: riskColor }]}>{getRiskLabel(risk)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [classifications, riskLevels]);

  // ── Detail Modal ───────────────────────────────────────────────────────
  const DetailModal = useCallback(() => {
    if (!selected) return null;
    const key      = String(selected._id);
    const cat      = classifications[key] || 'loading';
    const risk     = riskLevels[key];
    const cfg      = CAT[cat] || CAT.loading;
    const isSpam   = cat === 'spam';
    const isWaiting = cat === 'waiting_verification';

    return (
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
            <View style={[styles.modalTop, { backgroundColor: cfg.bg }]}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={COLORS.sub} />
              </TouchableOpacity>
              <Ionicons name={cfg.icon} size={40} color={cfg.color} />
              <Text style={[styles.modalCatText, { color: cfg.color }]}>{cfg.label}</Text>

              {/* ADDED: info banner for waiting_verification */}
              {isWaiting && (
                <View style={styles.waitingInfo}>
                  <Ionicons name="information-circle-outline" size={14} color="#6D28D9" />
                  <Text style={styles.waitingInfoText}>
                    Submitted for admin review. Label will update once verified.
                  </Text>
                </View>
              )}

              {risk && risk !== 'unknown' && (
                <View style={[styles.modalRiskBadge, { backgroundColor: getRiskColor(risk) + '20' }]}>
                  <Ionicons name={getRiskIcon(risk)} size={12} color={getRiskColor(risk)} style={{ marginRight: 4 }} />
                  <Text style={[styles.modalRiskText, { color: getRiskColor(risk) }]}>
                    {getRiskLabel(risk)}
                  </Text>
                </View>
              )}
            </View>

            {/* Sender info */}
            <View style={styles.modalBody}>
              <View style={styles.modalSenderRow}>
                <Ionicons name="person-circle-outline" size={20} color={COLORS.sub} style={{ marginRight: 8 }} />
                <Text style={styles.modalSender}>{formatSender(selected.address)}</Text>
                <Text style={styles.modalRaw}>({selected.address})</Text>
              </View>
              <Text style={styles.modalDate}>
                {new Date(selected.date).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <View style={styles.modalMsgBox}>
                <Text style={styles.modalMsgText}>{selected.body}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>

              {/* ADDED: waiting_verification — show pending info, no action buttons */}
              {isWaiting && (
                <View style={styles.waitingAction}>
                  <Ionicons name="hourglass-outline" size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={styles.waitingActionText}>Awaiting admin decision...</Text>
                </View>
              )}

              {/* Safe message → Report button */}
              {!isSpam && !isWaiting && cat !== 'uncertain' && (
                <TouchableOpacity
                  style={styles.btnReport}
                  onPress={() =>
                    Alert.alert(
                      'Report as Spam',
                      'Are you sure? This will be sent for admin verification.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Report', style: 'destructive', onPress: () => reportSpam(selected) },
                      ]
                    )
                  }
                >
                  <Ionicons name="flag-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.btnReportText}>Report as Scam</Text>
                </TouchableOpacity>
              )}

              {/* Confirmed spam → Remove from Spam */}
              {isSpam && (
                <TouchableOpacity style={styles.btnNotSpam} onPress={() => markNotSpam(key, selected)}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.btnNotSpamText}>Remove from Spam</Text>
                </TouchableOpacity>
              )}

              {/* CHANGED: uncertain → "Yes, Spam" now goes to waiting_verification */}
              {cat === 'uncertain' && (
                <>
                  <TouchableOpacity
                    style={styles.btnReport}
                    onPress={() =>
                      Alert.alert(
                        'Report as Spam',
                        'This will be sent for admin verification. Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Yes, Report', style: 'destructive', onPress: () => reportSpam(selected) },
                        ]
                      )
                    }
                  >
                    <Ionicons name="flag-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.btnReportText}>Yes, Spam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnNotSpam} onPress={() => markNotSpam(key, selected)}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.btnNotSpamText}>Not Spam</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.btnClose} onPress={() => setSelected(null)}>
                <Text style={styles.btnCloseText}>Close</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    );
  }, [selected, classifications, riskLevels]);

  // ── Permission denied ──────────────────────────────────────────────────
  if (permDenied) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={56} color="#CBD5E1" />
          <Text style={styles.permTitle}>SMS Permission Required</Text>
          <Text style={styles.permSub}>
            Settings → Apps → MeroSuraksha → Permissions → Enable SMS
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSub}>Loading...</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={{ color: COLORS.sub, marginTop: 16, fontSize: 14 }}>
            Loading from cache...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerMeta}>
            {isAnalyzing && (
              <View style={styles.analyzingBadge}>
                <ActivityIndicator size={10} color={COLORS.accent} style={{ marginRight: 4 }} />
                <Text style={styles.analyzingText}>Scanning {analyzingCount}...</Text>
              </View>
            )}
            <Text style={styles.headerSub}>
              {messages.length} msgs · {getLastRefreshedText()}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.checkBtn, (checkingNew || isAnalyzing) && styles.checkBtnDisabled]}
          onPress={checkForNewMessages}
          disabled={checkingNew || isAnalyzing}
        >
          {checkingNew
            ? <ActivityIndicator size={14} color={COLORS.accent} style={{ marginRight: 5 }} />
            : <Ionicons name="refresh" size={14} color={COLORS.accent} style={{ marginRight: 5 }} />
          }
          <Text style={styles.checkBtnText}>
            {checkingNew ? 'Checking...' : 'Check New'}
          </Text>
        </TouchableOpacity>
      </View>

      {newMsgsFound > 0 && (
        <View style={styles.newBanner}>
          <Ionicons name="chatbubble" size={14} color="#065F46" style={{ marginRight: 6 }} />
          <Text style={styles.newBannerText}>
            {newMsgsFound} new message{newMsgsFound > 1 ? 's' : ''} found — scanning now
          </Text>
          <TouchableOpacity onPress={() => setNewMsgsFound(0)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={14} color="#065F46" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={COLORS.sub} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search number or message..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.sub} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {['all', 'spam', 'safe', 'review'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'spam' ? 'Spam' : f === 'safe' ? 'Safe' : 'Review'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={displayMessages}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={20}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No messages found</Text>
              <Text style={styles.emptySub}>Pull down to refresh</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      <DetailModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.dark },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerMeta:  { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  headerSub:   { fontSize: 12, color: '#94A3B8' },
  analyzingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E3A5F', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 20,
  },
  analyzingText: { fontSize: 11, color: '#93C5FD' },
  checkBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#C7D2FE', marginLeft: 10,
  },
  checkBtnDisabled: { opacity: 0.5 },
  checkBtnText:     { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  newBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', marginHorizontal: 16,
    marginBottom: 8, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  newBannerText: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  body: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16,
  },
  centerContent: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12,
    paddingHorizontal: 14, marginHorizontal: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput:      { flex: 1, paddingVertical: 11, fontSize: 14, color: COLORS.dark },
  filterRow:        { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  filterTab: {
    flex: 1, paddingVertical: 8, marginHorizontal: 3,
    borderRadius: 20, backgroundColor: COLORS.white,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  filterTabActive:  { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  filterText:       { fontSize: 12, fontWeight: '600', color: COLORS.sub },
  filterTextActive: { color: COLORS.white },
  msgCard: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    padding: 14, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },
  msgCardSpam:    { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  msgCardWaiting: { borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  msgContent: { flex: 1 },
  msgTop: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  sender:    { fontSize: 14, fontWeight: '700', color: COLORS.dark, flex: 1 },
  msgTime:   { fontSize: 11, color: COLORS.sub },
  msgBody:   { fontSize: 13, color: COLORS.sub, lineHeight: 18, marginBottom: 8 },
  badgeRow:  { flexDirection: 'row', alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  emptyWrap:  { paddingTop: 80, alignItems: 'center' },
  emptyText:  { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12 },
  emptySub:   { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  permTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.dark,
    marginTop: 16, textAlign: 'center',
  },
  permSub: {
    fontSize: 13, color: COLORS.sub, marginTop: 8,
    textAlign: 'center', lineHeight: 20,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(32,41,64,0.75)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
  },
  modalTop: {
    alignItems: 'center', paddingTop: 32,
    paddingBottom: 20, paddingHorizontal: 20, position: 'relative',
  },
  modalClose:   { position: 'absolute', top: 16, right: 16, padding: 4 },
  modalCatText: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  waitingInfo: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE9FE', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 10, gap: 6,
  },
  waitingInfoText: { fontSize: 12, color: '#6D28D9', flex: 1, lineHeight: 16 },
  waitingAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#F5F3FF',
    borderWidth: 1.5, borderColor: '#8B5CF6',
    paddingVertical: 13, borderRadius: 14,
  },
  waitingActionText: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
  modalRiskBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8,
  },
  modalRiskText:  { fontSize: 12, fontWeight: '700' },
  modalBody:      { padding: 20 },
  modalSenderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modalSender:    { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  modalRaw:       { fontSize: 12, color: COLORS.sub, marginLeft: 6 },
  modalDate:      { fontSize: 12, color: COLORS.sub, marginBottom: 14 },
  modalMsgBox: {
    backgroundColor: COLORS.bg, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  modalMsgText:  { fontSize: 14, color: COLORS.dark, lineHeight: 22 },
  modalActions:  { flexDirection: 'row', padding: 16, gap: 8, flexWrap: 'wrap' },
  btnReport: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5,
    borderColor: '#EF4444', paddingVertical: 13, borderRadius: 14,
  },
  btnReportText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  btnNotSpam: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5,
    borderColor: '#10B981', paddingVertical: 13, borderRadius: 14,
  },
  btnNotSpamText: { color: '#10B981', fontWeight: '700', fontSize: 13 },
  btnClose: {
    flex: 1, backgroundColor: COLORS.dark,
    paddingVertical: 13, borderRadius: 14, alignItems: 'center',
  },
  btnCloseText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});