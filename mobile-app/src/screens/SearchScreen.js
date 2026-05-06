// mobile-app/src/screens/SearchScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { numberAPI } from '../api/api';

const COLORS = { bg: '#F0F4FF', dark: '#202940', accent: '#3B6FE8', white: '#FFFFFF', sub: '#6B7280' };

const RISK_CONFIG = {
  high:    { color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle',     label: 'High Risk' },
  medium:  { color: '#F59E0B', bg: '#FFFBEB', icon: 'warning',          label: 'Medium Risk' },
  low:     { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle', label: 'Low Risk' },
  unknown: { color: '#6B7280', bg: '#F9FAFB', icon: 'help-circle',      label: 'Unknown' },
};

export default function SearchScreen() {
  const [number,  setNumber]  = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const cleaned = number.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!cleaned || cleaned.length < 7)
      return Alert.alert('Error', 'Please enter a valid phone number.');
    setLoading(true);
    setResult(null);
    try {
      const res = await numberAPI.lookupNumber(cleaned);
      setResult(res.data.result);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not look up number.');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.riskLevel || 'unknown';
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.unknown;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check a Number</Text>
        <Text style={styles.headerSub}>Look up any phone number for risk</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.searchBox}>
          <Ionicons name="call-outline" size={20} color={COLORS.sub} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. 9841234567"
            placeholderTextColor="#9CA3AF"
            value={number}
            onChangeText={setNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />
          {number.length > 0 && (
            <TouchableOpacity onPress={() => { setNumber(''); setResult(null); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.sub} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="search" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.searchBtnText}>Search</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { borderColor: cfg.color + '40', backgroundColor: cfg.bg }]}>
            <View style={styles.resultHeader}>
              <Ionicons name={cfg.icon} size={36} color={cfg.color} />
              <View style={{ marginLeft: 14 }}>
                <Text style={[styles.riskLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={styles.resultNumber}>{result.number || number}</Text>
              </View>
            </View>
            <View style={styles.resultStats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{result.spamCount || 0}</Text>
                <Text style={styles.statLbl}>Spam Reports</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{result.reportCount || 0}</Text>
                <Text style={styles.statLbl}>User Reports</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{result.uniqueVictimCount || 0}</Text>
                <Text style={styles.statLbl}>Victims</Text>
              </View>
            </View>
            {result.message && (
              <Text style={styles.resultMsg}>{result.message}</Text>
            )}
          </View>
        )}

        {!result && !loading && (
          <View style={styles.placeholder}>
            <Ionicons name="phone-portrait-outline" size={48} color="#CBD5E1" />
            <Text style={styles.placeholderText}>Enter a number to check its risk level</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.dark },
  header:      { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub:   { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  body: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 12,
  },
  searchInput:   { flex: 1, paddingVertical: 16, fontSize: 16, color: COLORS.dark },
  searchBtn: {
    backgroundColor: COLORS.accent, paddingVertical: 16,
    borderRadius: 14, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginBottom: 24,
  },
  searchBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resultCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  resultHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  riskLabel:     { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  resultNumber:  { fontSize: 14, color: COLORS.sub, fontWeight: '500' },
  resultStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#E2E8F0', marginBottom: 12,
  },
  stat:        { alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  statLbl:     { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },
  resultMsg:   { fontSize: 13, color: COLORS.sub, textAlign: 'center' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 14, color: '#94A3B8', marginTop: 12, textAlign: 'center' },
});