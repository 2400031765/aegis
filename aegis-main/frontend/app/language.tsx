import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../src/components/AmbientBackground';
import { BlendedLogo } from '../src/components/BlendedLogo';
import { GlassCard } from '../src/components/GlassCard';
import { GradientButton } from '../src/components/GradientButton';
import { Text } from '../src/components/Text';
import { colors, spacing, radii } from '../src/theme';
import { PRIMARY_LANGUAGES, ADDITIONAL_LANGUAGES, type Language } from '../src/i18n/languages';
import { useAuthStore } from '../src/store/authStore';
import { getDeviceLocale } from '../src/i18n';

const Row = ({
  lang,
  selected,
  detected,
  onSelect,
}: {
  lang: Language;
  selected: boolean;
  detected: boolean;
  onSelect: () => void;
}) => (
  <Pressable testID={`lang-option-${lang.code}`} onPress={onSelect}>
    <GlassCard
      style={[styles.card, selected && styles.cardSelected]}
      borderColor={selected ? colors.brand.primary : undefined}
    >
      <View style={styles.cardRow}>
        <View style={styles.flagBox}>
          <Text style={styles.flag}>{lang.flag}</Text>
        </View>
        <View style={styles.cardText}>
          <View style={styles.nameRow}>
            <Text variant="bodyBase" weight="semi">
              {lang.name}
            </Text>
            {detected ? (
              <View style={styles.detectedPill}>
                <Text variant="label" color="#fff" style={{ letterSpacing: 1 }}>
                  Auto
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="bodySm" color={colors.text.secondary}>
            {lang.native}
          </Text>
        </View>
        <View style={styles.codeWrap}>
          <Text
            variant="label"
            color={selected ? colors.brand.secondary : colors.text.tertiary}
          >
            {lang.code}
          </Text>
          {selected ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          ) : null}
        </View>
      </View>
    </GlassCard>
  </Pressable>
);

export default function LanguageScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<string>(language || getDeviceLocale() || 'en');
  const [showMore, setShowMore] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.out(Easing.exp);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, easing, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 600, easing, useNativeDriver: true }),
      ]),
      Animated.timing(listOpacity, { toValue: 1, duration: 700, easing, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerY, listOpacity]);

  const detectedCode = useMemo(() => getDeviceLocale(), []);

  const handleContinue = async () => {
    await setLanguage(selected);
    router.replace('/auth/login');
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View
          style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
        >
          <View style={styles.topBar}>
            <Pressable
              testID="lang-back-btn"
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </Pressable>
            <View style={styles.brandRow}>
              <BlendedLogo size={36} pulse={false} />
              <Text variant="bodyBase" weight="bold" style={styles.brandText}>
                AEGIS
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <Text variant="label" color={colors.brand.secondary} style={styles.eyebrow}>
            Step 1 of 3
          </Text>
          <Text variant="h2" weight="bold" style={styles.title}>
            Choose your{'\n'}
            <Text variant="h2" weight="bold" color={colors.brand.secondary}>
              language.
            </Text>
          </Text>
          <Text variant="bodyBase" color={colors.text.secondary} style={styles.subtitle}>
            AEGIS speaks your language during emergencies. You can change this anytime.
          </Text>
        </Animated.View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: listOpacity }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {PRIMARY_LANGUAGES.map((lang) => (
            <Row
              key={lang.code}
              lang={lang}
              selected={selected === lang.code}
              detected={detectedCode === lang.code}
              onSelect={() => setSelected(lang.code)}
            />
          ))}

          <Pressable
            testID="lang-toggle-more"
            onPress={() => setShowMore((v) => !v)}
            style={styles.moreBtn}
          >
            <Ionicons
              name={showMore ? 'chevron-up' : 'add'}
              size={16}
              color={colors.brand.secondary}
            />
            <Text variant="label" color={colors.brand.secondary}>
              {showMore ? 'Show fewer' : 'More languages'}
            </Text>
          </Pressable>

          {showMore
            ? ADDITIONAL_LANGUAGES.map((lang) => (
                <Row
                  key={lang.code}
                  lang={lang}
                  selected={selected === lang.code}
                  detected={detectedCode === lang.code}
                  onSelect={() => setSelected(lang.code)}
                />
              ))
            : null}
        </Animated.ScrollView>

        <View style={styles.ctaWrap}>
          <GradientButton
            label="Continue"
            testID="lang-continue-btn"
            onPress={handleContinue}
          />
        </View>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screenPadding,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: {
    letterSpacing: 4,
  },
  eyebrow: { marginTop: spacing.xl },
  title: { marginTop: spacing.sm },
  subtitle: { marginTop: spacing.sm, maxWidth: 340 },
  scroll: { flex: 1, marginTop: spacing.lg },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  cardSelected: {
    borderWidth: 1.5,
    shadowColor: '#7000FF',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flagBox: {
    width: 48, height: 48, borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  flag: { fontSize: 26 },
  cardText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detectedPill: {
    backgroundColor: 'rgba(255,32,121,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  codeWrap: { alignItems: 'flex-end', gap: 6 },
  checkBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.brand.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  ctaWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});
