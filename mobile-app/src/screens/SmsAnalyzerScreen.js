// mobile-app/src/screens/SmsAnalyzerScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { smsAPI } from '../api/api';

const COLORS = { bg: '#F0F4FF', dark: '#202940', accent: '#3B6FE8', white: '#FFFFFF', sub: '#6B7280' };

export default function SmsAnalyzerScreen() {
  const [message,     setMessage]     = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);

  const handleAnalyze = async () => {
    if (!message.trim()) return Alert.alert('Error', 'Please enter a message to analyze.');
    setLoading(true);
    setResult(null);
    try {
      const res = await smsAPI.analyzeMessage(message.trim(), phoneNumber.trim() || undefined);
      setResult(res.data.result);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const getResultStyle = (label) => {
    if (label === 'spam')      return { color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle',     text: 'SPAM DETECTED' };
    if (label === 'uncertain') return { color: '#F59E0B', bg: '#FFFBEB', icon: 'warning',          text: 'UNCERTAIN — Sent for Review' };
    return                            { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle', text: 'LOOKS SAFE' };
  };

  const cfg = result ? getResultStyle(result.label) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>SMS Analyzer</Text>
        <Text style={styles.headerSub}>Paste an SMS to check if it's a scam</Text>
      </View>

      <ScrollView style={styles.body}>
        <Text style={styles.label}>Phone Number (optional)</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={18} color={COLORS.sub} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Sender's number"
            placeholderTextColor="#9CA3AF"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>SMS Message</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Paste the suspicious SMS message here..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="scan" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.analyzeBtnText}>Analyze Message</Text>
            </>
          )}
        </TouchableOpacity>

        {cfg && result && (
          <View style={[styles.resultCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
            <Ionicons name={cfg.icon} size={40} color={cfg.color} style={{ marginBottom: 12 }} />
            <Text style={[styles.resultLabel, { color: cfg.color }]}>{cfg.text}</Text>
            <Text style={styles.confidenceText}>
              Confidence: {result.confidence !== undefined
                ? `${Math.round(result.confidence * 100)}%`
                : 'N/A'}
            </Text>
            {result.classification && (
              <Text style={styles.classText}>Classification: {result.classification}</Text>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  label:    { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 16,
  },
  input:    { flex: 1, paddingVertical: 14, fontSize: 14, color: COLORS.dark },
  textArea: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', fontSize: 14,
    color: COLORS.dark, minHeight: 140, marginBottom: 16,
  },
  analyzeBtn: {
    backgroundColor: COLORS.accent, paddingVertical: 16,
    borderRadius: 14, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginBottom: 24,
  },
  analyzeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resultCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 24,
    alignItems: 'center', marginBottom: 16,
  },
  resultLabel:    { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  confidenceText: { fontSize: 14, color: COLORS.sub, marginBottom: 4 },
  classText:      { fontSize: 13, color: COLORS.sub },
});