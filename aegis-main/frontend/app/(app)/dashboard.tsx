import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { BlendedLogo } from '../../src/components/BlendedLogo';
import { GlassCard } from '../../src/components/GlassCard';
import { Text } from '../../src/components/Text';
import { SOSButton } from '../../src/components/SOSButton';
import { VoiceAlertModal } from '../../src/components/VoiceAlertModal';
import { colors, spacing, radii } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useEmergencyStore } from '../../src/store/emergencyStore';
import { useContactsStore } from '../../src/store/contactsStore';
import { useSafewordStore } from '../../src/store/safewordStore';
import { findLanguage } from '../../src/i18n/languages';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const language = useAuthStore((s) => s.language);
  const signOut = useAuthStore((s) => s.signOut);
  const startCountdown = useEmergencyStore((s) => s.startCountdown);
  const contacts = useContactsStore((s) => s.contacts);
  const safeword = useSafewordStore((s) => s.safeword);
  const hydrateSafeword = useSafewordStore((s) => s.hydrate);

  const [voiceAlertVisible, setVoiceAlertVisible] = useState(false);

  // Hydrate safeword from AsyncStorage on mount
  useEffect(() => {
    hydrateSafeword();
  }, [hydrateSafeword]);

  const lang = findLanguage(language);
  const greetingName = user?.displayName || user?.email?.split('@')[0] || t('dashboard.fallbackName');
  const selectedCount = contacts.filter((c) => c.selectedForSos !== false).length;

  const onSignOut = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const onSOS = () => {
    startCountdown();
    router.push('/(app)/emergency/countdown');
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <BlendedLogo size={42} pulse={false} />
              <View>
                <Text variant="bodyBase" weight="bold" style={styles.brandText}>
                  AEGIS
                </Text>
                <Text variant="label" color={colors.text.tertiary}>
                  {lang ? lang.native : 'EN'}
                </Text>
              </View>
            </View>
            <Pressable
              testID="dashboard-signout-btn"
              onPress={onSignOut}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Greeting */}
          <View style={styles.heroBlock}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text variant="label" color={colors.brand.secondary}>
                {t('dashboard.protected')}
              </Text>
            </View>
            <Text variant="h2" weight="bold" style={styles.helloTitle}>
              {t('dashboard.hello')}{"\n"}
              <Text variant="h2" weight="bold" color={colors.brand.secondary}>
                {greetingName}.
              </Text>
            </Text>
            <Text variant="bodyBase" color={colors.text.secondary} style={styles.helloSub}>
              {t('dashboard.subtitle')}
            </Text>
          </View>

          {/* SOS Button */}
          <View style={styles.sosBlock}>
            <SOSButton size={210} onPress={onSOS} testID="dashboard-sos-btn" hint={t('dashboard.holdToActivate')} />
            <Text variant="bodySm" color={colors.text.tertiary} style={styles.sosHint}>
              {t('dashboard.sosHint')}
            </Text>
          </View>

          {/* Trusted contacts shortcut */}
          <Pressable
            testID="dashboard-contacts-btn"
            onPress={() => router.push('/(app)/contacts')}
          >
            <GlassCard style={styles.contactsCard}>
              <View style={styles.contactsRow}>
                <View style={styles.contactsIcon}>
                  <Ionicons name="people" size={20} color={colors.brand.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBase" weight="semi">{t('dashboard.trustedCircle')}</Text>
                  <Text variant="bodySm" color={colors.text.secondary}>
                    {contacts.length === 0
                      ? t('dashboard.addContacts')
                      : t('dashboard.contactsSelected', { selected: selectedCount, total: contacts.length })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          {/* Feature grid */}
          <View style={styles.featuresGrid}>
            {[
              { id: 'aegis-ai', icon: 'sparkles' as const, title: t('dashboard.featureAiTitle'), desc: t('dashboard.featureAiDesc'), route: '/(app)/assistant' as const, onPress: null as (() => void) | null },
              { id: 'safewalk', icon: 'walk' as const, title: t('dashboard.featureWalkTitle'), desc: t('dashboard.featureWalkDesc'), route: '/(app)/safewalk' as const, onPress: null },
              { id: 'voice-alert', icon: 'mic' as const, title: t('dashboard.featureVoiceTitle'), desc: safeword ? `Active: "${safeword}"` : t('dashboard.featureVoiceDesc'), route: null, onPress: () => setVoiceAlertVisible(true) },
              { id: 'safety-tips', icon: 'shield-checkmark' as const, title: t('dashboard.featureTipsTitle'), desc: t('dashboard.featureTipsDesc'), route: '/(app)/safety-tips' as const, onPress: null },
            ].map((f, i) => (
              <Pressable
                key={i}
                testID={`dashboard-feature-${f.id}`}
                onPress={() => {
                  if (f.onPress) { f.onPress(); return; }
                  if (f.route) router.push(f.route as never);
                }}
                disabled={!f.route && !f.onPress}
                style={{ width: '47%', flexGrow: 1 }}
              >
                <GlassCard style={[
                  styles.featureCard,
                  f.title === t('dashboard.featureAiTitle') && styles.featureCardHighlight,
                  f.id === 'voice-alert' && safeword ? styles.featureCardVoiceActive : null,
                ]}>
                  <View style={[
                    styles.featureIcon,
                    f.title === t('dashboard.featureAiTitle') && styles.featureIconHighlight,
                    f.id === 'voice-alert' && safeword ? styles.featureIconVoiceActive : null,
                  ]}>
                    <Ionicons
                      name={f.id === 'voice-alert' && safeword ? 'mic' : f.icon}
                      size={20}
                      color={f.title === t('dashboard.featureAiTitle') ? '#fff' : f.id === 'voice-alert' && safeword ? '#fff' : colors.brand.secondary}
                    />
                  </View>
                  <Text variant="bodyBase" weight="semi">{f.title}</Text>
                  <Text variant="bodySm" color={f.id === 'voice-alert' && safeword ? '#39FFA0' : colors.text.secondary} numberOfLines={2}>{f.desc}</Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>

          <Text variant="label" color={colors.text.tertiary} style={styles.disclaimer}>
            {t('dashboard.disclaimer')}
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* Voice Alert safeword setup modal */}
      <VoiceAlertModal
        visible={voiceAlertVisible}
        onClose={() => setVoiceAlertVisible(false)}
      />
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: {
    letterSpacing: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroBlock: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39FFA0',
    shadowColor: '#39FFA0',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  helloTitle: {
    marginTop: spacing.sm,
  },
  helloSub: {
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  sosBlock: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  sosHint: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  contactsCard: {
    padding: spacing.md,
  },
  contactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactsIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,32,121,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    width: '100%',
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  featureCardHighlight: {
    borderColor: 'rgba(255,32,121,0.5)',
    borderWidth: 1.5,
    shadowColor: '#FF2079',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,32,121,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconHighlight: {
    backgroundColor: '#FF2079',
    borderColor: '#FF2079',
  },
  featureCardVoiceActive: {
    borderColor: 'rgba(57,255,160,0.4)',
    borderWidth: 1.5,
    shadowColor: '#39FFA0',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  featureIconVoiceActive: {
    backgroundColor: '#39FFA0',
    borderColor: '#39FFA0',
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
