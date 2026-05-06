// mobile-app/src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  bg: '#202940', card: '#FFFFFF', accent: '#3B6FE8',
  text: '#202940', sub: '#6B7280', white: '#FFFFFF',
  input: '#F8FAFC', border: '#E2E8F0',
};

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.appName}>MeroSuraksha</Text>
          <Text style={styles.tagline}>Your digital safety companion</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.sub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.sub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnPrimaryText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnGoogle}>
            <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
            <Text style={styles.btnGoogleText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  header:  { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#3B6FE8', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12,
  },
  appName:  { fontSize: 22, fontWeight: '700', color: COLORS.white },
  tagline:  { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  card: {
    flex: 1, backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28,
  },
  cardTitle:  { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub:    { fontSize: 14, color: COLORS.sub, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.input, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14,
  },
  inputIcon:      { marginRight: 8 },
  input:          { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eyeBtn:         { padding: 4 },
  btnPrimary: {
    backgroundColor: COLORS.accent, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText:    { marginHorizontal: 12, color: COLORS.sub, fontSize: 13 },
  btnGoogle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 14,
    borderRadius: 14, marginBottom: 24,
  },
  btnGoogleText:  { fontSize: 15, fontWeight: '500', color: COLORS.text },
  signupRow:      { flexDirection: 'row', justifyContent: 'center' },
  signupText:     { color: COLORS.sub, fontSize: 14 },
  signupLink:     { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
});