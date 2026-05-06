import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  bg: '#202940', white: '#FFFFFF', accent: '#3B6FE8',
  text: '#202940', sub: '#6B7280', input: '#F8FAFC',
  border: '#E2E8F0',
};

// ── Field component defined OUTSIDE SignupScreen ───────────────────────────
// This is the fix — if defined inside, it remounts on every keystroke
const FormField = ({
  label, icon, placeholder, keyboardType,
  secure, showToggle, onToggle, value, onChange,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={COLORS.sub} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        secureTextEntry={secure}
        autoCorrect={false}
        blurOnSubmit={false}
      />
      {showToggle !== undefined && (
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons
            name={showToggle ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={COLORS.sub}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ── Main Screen ────────────────────────────────────────────────────────────
export default function SignupScreen({ navigation }) {
  const { register } = useAuth();

  const [name,        setName]        = useState('');
  const [age,         setAge]         = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);

  // useCallback prevents function recreation on every render
  const togglePass    = useCallback(() => setShowPass((v) => !v),    []);
  const toggleConfirm = useCallback(() => setShowConfirm((v) => !v), []);

  const handleSignup = async () => {
    if (!name || !age || !email || !password || !confirm)
      return Alert.alert('Error', 'Please fill in all fields.');
    if (password !== confirm)
      return Alert.alert('Error', 'Passwords do not match.');
    if (password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters.');
    if (isNaN(parseInt(age)) || parseInt(age) < 13)
      return Alert.alert('Error', 'Please enter a valid age (13+).');

    setLoading(true);
    try {
      await register(name.trim(), parseInt(age), email.trim(), password);
    } catch (err) {
      Alert.alert(
        'Sign Up Failed',
        err?.response?.data?.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={28} color={COLORS.white} />
        </View>
        <Text style={styles.appName}>Create Account</Text>
      </View>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.card}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text style={styles.cardTitle}>Join MeroSuraksha</Text>
          <Text style={styles.cardSub}>Stay protected from scams</Text>

          <FormField
            label="Full Name"
            icon="person-outline"
            placeholder=" "
            value={name}
            onChange={setName}
          />
          <FormField
            label="Age"
            icon="calendar-outline"
            placeholder=""
            keyboardType="numeric"
            value={age}
            onChange={setAge}
          />
          <FormField
            label="Email"
            icon="mail-outline"
            placeholder=" "
            keyboardType="email-address"
            value={email}
            onChange={setEmail}
          />
          <FormField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Min. 6 characters"
            secure={!showPass}
            showToggle={showPass}
            onToggle={togglePass}
            value={password}
            onChange={setPassword}
          />
          <FormField
            label="Confirm Password"
            icon="shield-outline"
            placeholder="Repeat password"
            secure={!showConfirm}
            showToggle={showConfirm}
            onToggle={toggleConfirm}
            value={confirm}
            onChange={setConfirm}
          />

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnPrimaryText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnGoogle}>
            <Ionicons
              name="logo-google"
              size={18}
              color="#EA4335"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.btnGoogleText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    alignItems: 'center', paddingTop: 20,
    paddingBottom: 20, position: 'relative',
  },
  backBtn: { position: 'absolute', left: 20, top: 24 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3B6FE8', justifyContent: 'center',
    alignItems: 'center', marginBottom: 8,
  },
  appName: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  card: {
    flex: 1, backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 28, paddingTop: 28,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: COLORS.sub, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.input, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, paddingVertical: 13,
    fontSize: 14, color: COLORS.text,
  },
  eyeBtn: { padding: 4 },
  btnPrimary: {
    backgroundColor: COLORS.accent, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
    marginTop: 8, marginBottom: 20,
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, color: COLORS.sub, fontSize: 13 },
  btnGoogle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingVertical: 14, borderRadius: 14, marginBottom: 20,
  },
  btnGoogleText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: COLORS.sub, fontSize: 14 },
  loginLink: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
});