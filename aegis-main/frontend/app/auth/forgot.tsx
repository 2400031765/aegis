import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { AuthHeader } from '../../src/components/AuthHeader';
import { FormField } from '../../src/components/FormField';
import { GradientButton } from '../../src/components/GradientButton';
import { Text } from '../../src/components/Text';
import { colors, spacing, radii } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { validators } from '../../src/services/auth';

export default function ForgotScreen() {
  const router = useRouter();
  const sendReset = useAuthStore((s) => s.sendReset);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!validators.email(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      await sendReset(email);
      setSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not send reset email.';
      setError(msg);
    }
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader title="Reset your password" subtitle="Enter your email and we’ll send you a secure reset link." />

            <View style={styles.form}>
              {!sent ? (
                <>
                  <FormField
                    testID="forgot-email"
                    label="Email"
                    icon="mail-outline"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    error={error}
                  />

                  <GradientButton
                    label={loading ? 'Sending…' : 'Send Reset Link'}
                    testID="forgot-submit-btn"
                    onPress={onSubmit}
                    disabled={loading}
                  />

                  {loading ? <ActivityIndicator color={colors.brand.secondary} /> : null}
                </>
              ) : (
                <View style={styles.successCard}>
                  <View style={styles.checkBadge}>
                    <Ionicons name="mail-open-outline" size={28} color="#fff" />
                  </View>
                  <Text variant="h3" weight="bold" style={{ textAlign: 'center', marginTop: spacing.md }}>
                    Check your inbox
                  </Text>
                  <Text variant="bodyBase" color={colors.text.secondary} style={styles.successDesc}>
                    We sent a secure password reset link to{'\n'}
                    <Text color={colors.text.primary} weight="semi">{email}</Text>
                  </Text>
                  <GradientButton
                    label="Back to Sign In"
                    testID="forgot-back-btn"
                    onPress={() => router.replace('/auth/login')}
                  />
                </View>
              )}

              <Pressable
                testID="forgot-go-login"
                onPress={() => router.replace('/auth/login')}
                style={styles.linkRow}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={14} color={colors.brand.secondary} />
                <Text variant="bodySm" color={colors.brand.secondary} weight="semi">
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  form: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: spacing.md,
  },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,32,121,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2079',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  successDesc: {
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
});
