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
import { useTranslation } from '../../src/hooks/useTranslation';

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
    if (!validators.name(name)) next.name = t('auth.nameRequired');
    if (!validators.email(email)) next.email = t('auth.invalidEmail');
    if (!validators.password(password)) next.password = t('auth.weakPassword');
    if (password !== confirm) next.confirm = t('auth.mismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      await signUp(email, password, name);
      router.replace('/(app)/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('auth.createFailed');
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
            <AuthHeader title={t('auth.createAccount')} subtitle={t('auth.createAccountSub')} />

            <View style={styles.form}>
              <FormField
                testID="signup-name"
                label={t('auth.fullName')}
                icon="person-outline"
                placeholder={t('auth.fullNamePlaceholder')}
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
              />
              <FormField
                testID="signup-email"
                label={t('auth.email')}
                icon="mail-outline"
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />
              <FormField
                testID="signup-password"
                label={t('auth.password')}
                icon="lock-closed-outline"
                placeholder={t('auth.passwordPlaceholder')}
                isPassword
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              <FormField
                testID="signup-confirm"
                label={t('auth.passwordConfirm')}
                icon="shield-checkmark-outline"
                placeholder={t('auth.confirmPlaceholder')}
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
                label={loading ? t('auth.creatingAccount') : t('auth.signup')}
                testID="signup-submit-btn"
                onPress={onSubmit}
                disabled={loading}
              />

              {loading ? <ActivityIndicator color={colors.brand.secondary} /> : null}

              <View style={styles.footerRow}>
                <Text variant="bodySm" color={colors.text.secondary}>
                  {t('auth.haveAccount')}
                </Text>
                <Pressable
                  testID="signup-go-login"
                  onPress={() => router.replace('/auth/login')}
                  hitSlop={8}
                >
                  <Text variant="bodySm" color={colors.brand.secondary} weight="bold">
                    {t('auth.signinCta')}
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
