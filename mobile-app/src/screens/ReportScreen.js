// mobile-app/src/screens/ReportScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { smsAPI } from '../api/api';

const COLORS = { bg: '#F0F4FF', dark: '#202940', accent: '#EF4444', white: '#FFFFFF', sub: '#6B7280' };

export default function ReportScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message,     setMessage]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const handleReport = async () => {
    if (!phoneNumber.trim() || !message.trim())
      return Alert.alert('Error', 'Both phone number and message are required.');
    setLoading(true);
    try {
      await smsAPI.reportMessage(phoneNumber.trim(), message.trim());
      setSubmitted(true);
      setPhoneNumber('');
      setMessage('');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report a Scam</Text>
        <Text style={styles.headerSub}>Help the community stay safe</Text>
      </View>

      <ScrollView style={styles.body}>
        {submitted && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.successText}>Report submitted! Thank you for helping others.</Text>
          </View>
        )}

        <Text style={styles.label}>Scammer's Phone Number</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={18} color={COLORS.sub} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="e.g. 9841234567"
            placeholderTextColor="#9CA3AF"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>Scam Message Content</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Paste the scam message here..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.reportBtn} onPress={handleReport} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="flag" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.reportBtnText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          All reports are reviewed and help train our AI model to detect new scam patterns.
        </Text>
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
  successBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', padding: 14, borderRadius: 12, marginBottom: 20,
  },
  successText: { flex: 1, color: '#065F46', fontSize: 13 },
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
  reportBtn: {
    backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  reportBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, color: COLORS.sub, textAlign: 'center', lineHeight: 18 },
});