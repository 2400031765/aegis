import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { AmbientBackground } from '../src/components/AmbientBackground';
import { BlendedLogo } from '../src/components/BlendedLogo';
import { GradientButton } from '../src/components/GradientButton';
import { Text } from '../src/components/Text';
import { colors, spacing, radii } from '../src/theme';
import { useTranslation } from '../src/hooks/useTranslation';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Feature {
  icon: IoniconName;
  label: string;
}

const useFade = (initial = 0) => useRef(new Animated.Value(initial)).current;

export default function SplashScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const features: Feature[] = [
    { icon: 'body', label: t('splash.features.sos') },
    { icon: 'scan-circle', label: t('splash.features.threat') },
    { icon: 'walk', label: t('splash.features.walk') },
    { icon: 'location', label: t('splash.features.location') },
  ];

  // Animation refs
  const headerOpacity = useFade();
  const headerScale = useRef(new Animated.Value(0.92)).current;
  const taglineOpacity = useFade();
  const lineOpacity = useFade();
  const safetyOpacity = useFade();
  const descOpacity = useFade();
  const featuresOpacity = useFade();
  const featuresY = useRef(new Animated.Value(20)).current;
  const youOpacity = useFade();
  const ctaOpacity = useFade();
  const ctaY = useRef(new Animated.Value(20)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.out(Easing.exp);

    Animated.sequence([
      // Step 1: Logo + AEGIS title + WELCOME label appear together
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 1000, easing, useNativeDriver: true }),
        Animated.timing(headerScale, { toValue: 1, duration: 1000, easing, useNativeDriver: true }),
      ]),
      // Step 2: Bracketed tagline
      Animated.timing(taglineOpacity, { toValue: 1, duration: 700, easing, useNativeDriver: true }),
      // Step 3: Pink separator line
      Animated.timing(lineOpacity, { toValue: 1, duration: 500, easing, useNativeDriver: true }),
      // Step 4: "FOR THE SAFETY..."
      Animated.timing(safetyOpacity, { toValue: 1, duration: 700, easing, useNativeDriver: true }),
      // Step 5: AI description
      Animated.timing(descOpacity, { toValue: 1, duration: 800, easing, useNativeDriver: true }),
      // Step 6: Feature row
      Animated.parallel([
        Animated.timing(featuresOpacity, { toValue: 1, duration: 700, easing, useNativeDriver: true }),
        Animated.timing(featuresY, { toValue: 0, duration: 700, easing, useNativeDriver: true }),
      ]),
      // Step 7: "YOU ARE NOT ALONE"
      Animated.timing(youOpacity, { toValue: 1, duration: 600, easing, useNativeDriver: true }),
      // Step 8: CTA
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 700, easing, useNativeDriver: true }),
        Animated.timing(ctaY, { toValue: 0, duration: 700, easing, useNativeDriver: true }),
      ]),
    ]).start();

    // Continuous logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [
    headerOpacity, headerScale, taglineOpacity, lineOpacity, safetyOpacity,
    descOpacity, featuresOpacity, featuresY, youOpacity, ctaOpacity, ctaY, pulse,
  ]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top: logo + WELCOME TO + AEGIS, side-by-side */}
          <Animated.View
            style={[
              styles.headerRow,
              { opacity: headerOpacity, transform: [{ scale: headerScale }] },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
              <BlendedLogo size={140} pulse={false} cinematic />
            </Animated.View>

            <View style={styles.headerText}>
              <Text variant="label" color={colors.brand.secondary} style={styles.welcomeLabel}>
                {t('splash.welcomeTo')}
              </Text>
              <Text style={styles.aegisWordmark}>AEGIS</Text>
            </View>
          </Animated.View>

          {/* Bracketed tagline */}
          <Animated.View style={{ opacity: taglineOpacity, marginTop: spacing.lg }}>
            <Text style={styles.brackets}>
              <Text style={styles.bracket}>[ </Text>
              <Text style={styles.tagline}>{t('splash.tagline')}</Text>
              <Text style={styles.bracket}> ]</Text>
            </Text>
          </Animated.View>

          {/* Pink separator line */}
          <Animated.View style={[styles.separator, { opacity: lineOpacity }]} />

          {/* For the safety of women around the world */}
          <Animated.View style={{ opacity: safetyOpacity, marginTop: spacing.lg }}>
            <Text style={styles.safetyLine}>{t('splash.forSafety')}</Text>
          </Animated.View>

          {/* AI description */}
          <Animated.View style={{ opacity: descOpacity, marginTop: spacing.xl }}>
            <Text style={styles.aiDesc}>
              {t('splash.aiDesc')}
            </Text>
          </Animated.View>

          {/* 4 feature tiles */}
          <Animated.View
            style={[styles.features, { opacity: featuresOpacity, transform: [{ translateY: featuresY }] }]}
          >
            {features.map((f, i) => (
              <View key={i} style={styles.featureCol}>
                <View style={styles.iconTile}>
                  <Ionicons name={f.icon} size={28} color={colors.brand.secondary} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* You are not alone */}
          <Animated.View style={{ opacity: youOpacity, marginTop: spacing.xl }}>
            <Text style={styles.youLine}>{t('splash.youAreNotAlone')}</Text>
          </Animated.View>

          {/* CTA */}
          <Animated.View
            style={[styles.ctaWrap, { opacity: ctaOpacity, transform: [{ translateY: ctaY }] }]}
          >
            <GradientButton
              label={t('splash.getStarted')}
              testID="splash-get-started-btn"
              height={68}
              colors={['#FF2079', '#B800E6', '#7000FF', '#4B2DFF']}
              onPress={() => router.push('/language')}
            />
            <Text style={styles.footer}>{t('splash.privacy')}</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  headerText: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  welcomeLabel: {
    letterSpacing: 2.5,
  },
  aegisWordmark: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 64,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 70,
    textShadowColor: 'rgba(184,0,230,0.6)',
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  brackets: {
    textAlign: 'center',
  },
  bracket: {
    color: colors.brand.secondary,
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
  },
  tagline: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    letterSpacing: 2,
  },
  separator: {
    width: 40,
    height: 2,
    backgroundColor: colors.brand.secondary,
    marginTop: spacing.md,
    borderRadius: 1,
  },
  safetyLine: {
    color: colors.brand.secondary,
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  aiDesc: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 380,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  featureCol: {
    flex: 1,
    alignItems: 'center',
  },
  iconTile: {
    width: 60,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    color: '#E8E6F0',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  youLine: {
    color: colors.brand.secondary,
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    letterSpacing: 2,
    textAlign: 'center',
  },
  ctaWrap: {
    width: '100%',
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footer: {
    color: colors.text.tertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
