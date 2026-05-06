// mobile-app/src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/api';

const COLORS = { bg: '#F0F4FF', white: '#FFFFFF', accent: '#3B6FE8', dark: '#202940', sub: '#6B7280' };

const StatCard = ({ icon, label, value, color, loading }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 8 }} />
    {loading ? (
      <ActivityIndicator size="small" color={color} style={{ marginBottom: 4 }} />
    ) : (
      <Text style={styles.statValue}>{value}</Text>
    )}
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={[styles.quickIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const { user, hasPermission, logout } = useAuth();
  const [refreshing,   setRefreshing]   = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    highRisk: 0, mediumRisk: 0, safeNumbers: 0, totalReports: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getCommunityStats();
      if (res.data?.success) setStats(res.data.stats);
    } catch (e) {
      console.log('[Home] Stats fetch error:', e.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setStatsLoading(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerSub}>Stay safe from scams</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.avatarBtn}>
          <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {!hasPermission && (
          <View style={styles.permBanner}>
            <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.permBannerText}>
              SMS access is off — only number search is available.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Community Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          <StatCard icon="alert-circle"     label="High Risk"     value={stats.highRisk}     color="#EF4444" loading={statsLoading} />
          <StatCard icon="warning"          label="Medium Risk"   value={stats.mediumRisk}   color="#F59E0B" loading={statsLoading} />
          <StatCard icon="checkmark-circle" label="Low Risk"  value={stats.safeNumbers}  color="#10B981" loading={statsLoading} />
          <StatCard icon="flag"             label="Reports Filed" value={stats.totalReports} color="#3B6FE8" loading={statsLoading} />
        </ScrollView>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="search"      label="Check Number" color="#3B6FE8" onPress={() => navigation.navigate('Search')} />
          <QuickAction icon="flag"        label="Report Scam"  color="#EF4444" onPress={() => navigation.navigate('Report')} />
          {hasPermission && <QuickAction icon="chatbubbles" label="Messages"   color="#8B5CF6" onPress={() => navigation.navigate('Messages')} />}
          {hasPermission && <QuickAction icon="scan"        label="Analyze SMS" color="#06B6D4" onPress={() => navigation.navigate('SmsAnalyzer')} />}
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={36} color="#CBD5E1" />
          <Text style={styles.emptyText}>No recent activity</Text>
          <Text style={styles.emptySub}>Searched numbers and reports will appear here</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.dark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  greeting:   { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSub:  { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  avatarBtn:  { padding: 8 },
  scroll: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  permBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF3C7', margin: 16, padding: 12, borderRadius: 12,
  },
  permBannerText: { flex: 1, fontSize: 13, color: '#92400E' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.dark,
    marginLeft: 20, marginTop: 20, marginBottom: 12,
  },
  statsRow:   { paddingLeft: 20 },
  statCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginRight: 12, width: 120, borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    minHeight: 90, justifyContent: 'center',
  },
  statValue:  { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  statLabel:  { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  quickAction: {
    width: '46%', margin: '2%', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  quickIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, textAlign: 'center' },
  emptyCard: {
    backgroundColor: COLORS.white, marginHorizontal: 20,
    borderRadius: 16, padding: 32, alignItems: 'center',
  },
  emptyText:  { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 12 },
  emptySub:   { fontSize: 12, color: '#CBD5E1', marginTop: 4, textAlign: 'center' },
});