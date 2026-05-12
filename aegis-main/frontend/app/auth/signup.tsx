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

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { AuthHeader } from '../../src/components/AuthHeader';
import { FormField } from '../../src/components/FormField';
import { GradientButton } from '../../src/components/GradientButton';
import { Text } from '../../src/components/Text';
import { colors, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { validators } from '../../src/services/auth';

export default function SignupScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; confirm?: string; form?: string;
  }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!validators.name(name)) next.name = 'Please enter your full name.';
    if (!validators.email(email)) next.email = 'Please enter a valid email address.';
    if (!validators.password(password)) next.password = 'Password must be at least 6 characters.';
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      await signUp(email, password, name);
      router.replace('/(app)/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create account.';
      setErrors({ form: msg });
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
            <AuthHeader title="Create your account" subtitle="Join AEGIS — your personal safety companion." />

            <View style={styles.form}>
              <FormField
                testID="signup-name"
                label="Full name"
                icon="person-outline"
                placeholder="Jane Doe"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
              />
              <FormField
                testID="signup-email"
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />
              <FormField
                testID="signup-password"
                label="Password"
                icon="lock-closed-outline"
                placeholder="At least 6 characters"
                isPassword
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              <FormField
                testID="signup-confirm"
                label="Confirm password"
                icon="shield-checkmark-outline"
                placeholder="Re-enter password"
                isPassword
                value={confirm}
                onChangeText={setConfirm}
                error={errors.confirm}
              />

              {errors.form ? (
                <Text variant="bodySm" color="#FF5577" style={{ textAlign: 'center' }}>
                  {errors.form}
                </Text>
              ) : null}

              <GradientButton
                label={loading ? 'Creating account…' : 'Create Account'}
                testID="signup-submit-btn"
                onPress={onSubmit}
                disabled={loading}
              />

              {loading ? <ActivityIndicator color={colors.brand.secondary} /> : null}

              <View style={styles.footerRow}>
                <Text variant="bodySm" color={colors.text.secondary}>
                  Already have an account?
                </Text>
                <Pressable
                  testID="signup-go-login"
                  onPress={() => router.replace('/auth/login')}
                  hitSlop={8}
                >
                  <Text variant="bodySm" color={colors.brand.secondary} weight="bold">
                    Sign In
                  </Text>
                </Pressable>
              </View>
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
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
