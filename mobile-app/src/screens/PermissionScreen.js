// mobile-app/src/screens/PermissionScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  bg: '#202940', accent: '#3B6FE8', white: '#FFFFFF',
  text: '#202940', sub: '#6B7280',
};

const PermissionItem = ({ icon, iconColor, iconBg, title, description }) => (
  <View style={styles.permItem}>
    <View style={[styles.permIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.permText}>
      <Text style={styles.permTitle}>{title}</Text>
      <Text style={styles.permDesc}>{description}</Text>
    </View>
  </View>
);

export default function PermissionScreen() {
  // No navigation prop needed — state change triggers re-render
  const { setPermissionGranted } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.topSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={42} color={COLORS.white} />
        </View>
        <Text style={styles.appName}>MeroSuraksha</Text>
        <Text style={styles.tagline}>
          To protect you from scams and fraud, we need a few{'\n'}
          permissions before getting started.
        </Text>
      </View>

      <View style={styles.card}>
        <PermissionItem
          icon="chatbubble-ellipses-outline"
          iconColor="#3B6FE8" iconBg="#EEF2FF"
          title="Read SMS Messages"
          description="Scan incoming messages to automatically detect scam and fraud attempts in real time."
        />
        <View style={styles.divider} />
        <PermissionItem
          icon="people-outline"
          iconColor="#1D4ED8" iconBg="#DBEAFE"
          title="Access Contacts"
          description="Identify unknown numbers and cross-reference against the scam database."
        />
        <View style={styles.divider} />
        <PermissionItem
          icon="notifications-outline"
          iconColor="#D97706" iconBg="#FEF3C7"
          title="Send Notifications"
          description="Alert you instantly when a high-risk or known scam number contacts you."
        />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => setPermissionGranted(true)}  // ← just set state
        >
          <Text style={styles.btnPrimaryText}>Allow & Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => setPermissionGranted(false)} // ← just set state
        >
          <Text style={styles.btnSecondaryText}>Skip for now</Text>
        </TouchableOpacity>
        <Text style={styles.privacy}>
          Your data stays private. We never sell or share your messages with third parties.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 32, paddingHorizontal: 24 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B6FE8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#3B6FE8', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  appName: { fontSize: 28, fontWeight: '700', color: COLORS.white, marginBottom: 10 },
  tagline: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 20,
    paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  permItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  permIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  permText: { flex: 1 },
  permTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  permDesc: { fontSize: 12, color: COLORS.sub, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20 },
  buttons: { paddingHorizontal: 20, paddingTop: 28 },
  btnPrimary: {
    backgroundColor: COLORS.white, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: COLORS.bg },
  btnSecondary: {
    borderWidth: 1.5, borderColor: '#475569', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '500', color: '#94A3B8' },
  privacy: { fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 16 },
});