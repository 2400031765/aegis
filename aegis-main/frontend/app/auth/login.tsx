import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Easing,
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
import { isFirebaseConfigured } from '../../src/services/firebase';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const signInAsGuest = useAuthStore((s) => s.signInAsGuest);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  const validate = () => {
    const next: typeof errors = {};
    if (!validators.email(email)) next.email = t('auth.invalidEmail');
    if (!validators.password(password)) next.password = t('auth.weakPassword');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onLogin = async () => {
    if (!validate()) return;

    try {
      setErrors({});

      console.log("START LOGIN");

      await signIn(email.trim(), password);

      console.log("LOGIN SUCCESS");

      router.replace('/(app)/dashboard');

    } catch (e: unknown) {
      console.log("LOGIN ERROR:", e);

      const msg = e instanceof Error ? e.message : t('auth.loginFailed');

      setErrors({ form: msg });
    }
  };

  const onGuest = async () => {
    try {
      await signInAsGuest();
      router.replace('/(app)/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('auth.guestFailed');
      setErrors({ form: msg });
    }
  };

  const onGoogle = async () => {
    try {
      alert(t('auth.googleComingSoon'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('auth.googleFailed');
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
            <Animated.View
              style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
            >
              <AuthHeader title={t('auth.welcomeBack')} subtitle={t('auth.welcomeBackSub')} showBack={false} />

              {!isFirebaseConfigured ? (
                <View style={styles.demoBanner}>
                  <Ionicons name="information-circle" size={16} color={colors.brand.secondary} />
                  <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                    {t('auth.demoBanner')}
                  </Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <FormField
                  testID="login-email"
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
                  testID="login-password"
                  label={t('auth.password')}
                  icon="lock-closed-outline"
                  placeholder={t('auth.passwordPlaceholder')}
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />

                <Pressable
                  testID="login-forgot-link"
                  onPress={() => router.push('/auth/forgot')}
                  style={styles.forgotLink}
                  hitSlop={8}
                >
                  <Text variant="bodySm" color={colors.brand.secondary} weight="semi">
                    {t('auth.forgot')}
                  </Text>
                </Pressable>

                {errors.form ? (
                  <Text variant="bodySm" color="#FF5577" style={{ textAlign: 'center' }}>
                    {errors.form}
                  </Text>
                ) : null}

                <GradientButton
                  label={loading ? t('auth.signingIn') : t('auth.login')}
                  testID="login-submit-btn"
                  onPress={onLogin}
                  disabled={loading}
                />

                {loading ? <ActivityIndicator color={colors.brand.secondary} /> : null}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text variant="bodySm" color={colors.text.tertiary}>
                    {t('auth.divider')}
                  </Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <Pressable
                    testID="login-google-btn"
                    onPress={onGoogle}
                    style={styles.socialBtn}
                  >
                    <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                    <Text variant="bodyBase" weight="semi">{t('auth.google')}</Text>
                  </Pressable>
                  <Pressable
                    testID="login-guest-btn"
                    onPress={onGuest}
                    style={styles.socialBtn}
                  >
                    <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                    <Text variant="bodyBase" weight="semi">{t('auth.guest')}</Text>
                  </Pressable>
                </View>

                <View style={styles.footerRow}>
                  <Text variant="bodySm" color={colors.text.secondary}>
                    {t('auth.noAccount')}
                  </Text>
                  <Pressable
                    testID="login-go-signup"
                    onPress={() => router.push('/auth/signup')}
                    hitSlop={8}
                  >
                    <Text variant="bodySm" color={colors.brand.secondary} weight="bold">
                      {t('auth.signupCta')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
    backgroundColor: 'rgba(255,32,121,0.06)',
  },
  form: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
