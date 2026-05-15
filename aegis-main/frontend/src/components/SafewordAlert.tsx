/**
 * SafewordAlert
 * Full-screen calming overlay shown when the user's safeword is detected.
 * Operates in stealth/silent mode — no loud alerts, no visible "EMERGENCY" text
 * that a bystander could read. Guides the user calmly toward SOS activation.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from './Text';
import { colors, spacing, radii } from '../theme';

interface Props {
  visible: boolean;
  onActivateSOS: () => void;
  onDismiss: () => void;
}

export const SafewordAlert = ({ visible, onActivateSOS, onDismiss }: Props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Subtle haptic — not alarming
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();

      // Gentle pulse on the shield icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      slideAnim.setValue(40);
      pulseAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim, pulseAnim]);

  const shieldScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['rgba(6,4,10,0.97)', 'rgba(14,9,20,0.98)']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Shield icon — calm, not alarming */}
          <View style={styles.iconBlock}>
            <Animated.View
              style={[
                styles.iconRing,
                { transform: [{ scale: shieldScale }] },
              ]}
            />
            <View style={styles.iconCore}>
              <Ionicons name="shield-checkmark" size={36} color="#fff" />
            </View>
          </View>

          {/* Calming message — neutral language, no "EMERGENCY" visible */}
          <View style={styles.textBlock}>
            <Text variant="h3" weight="bold" style={styles.title}>
              I'm right here with you.
            </Text>
            <Text variant="bodyBase" color={colors.text.secondary} style={styles.body}>
              Take a slow breath. You're not alone — AEGIS is ready to help.
            </Text>
          </View>

          {/* Breathing cue */}
          <View style={styles.breathingCard}>
            <Ionicons name="leaf" size={14} color="#39FFA0" />
            <Text variant="bodySm" color="#39FFA0">
              Breathe in for 4 counts · hold · breathe out for 4 counts
            </Text>
          </View>

          {/* Guidance */}
          <View style={styles.guidanceCard}>
            <Ionicons name="navigate-outline" size={14} color={colors.brand.secondary} />
            <Text variant="bodySm" color={colors.text.secondary}>
              Move toward a well-lit, crowded area. Keep your phone close.
            </Text>
          </View>

          {/* Trusted contacts note */}
          <View style={styles.contactsNote}>
            <Ionicons name="people-outline" size={14} color="#FFB800" />
            <Text variant="bodySm" color={colors.text.secondary}>
              Your trusted circle can be alerted with one tap below.
            </Text>
          </View>

          {/* CTAs */}
          <View style={styles.ctaBlock}>
            {/* Primary — activate SOS silently */}
            <Pressable
              testID="safeword-alert-sos-btn"
              onPress={onActivateSOS}
              style={styles.sosBtnWrap}
            >
              <LinearGradient
                colors={['#FF2079', '#B800E6', '#7000FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sosBtn}
              >
                <Ionicons name="shield" size={18} color="#fff" />
                <Text variant="bodyBase" weight="bold" color="#fff">
                  Activate Emergency Mode
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Secondary — dismiss (user may have typed safeword accidentally) */}
            <Pressable
              testID="safeword-alert-dismiss-btn"
              onPress={onDismiss}
              style={styles.dismissBtn}
            >
              <Text variant="label" color={colors.text.tertiary}>
                I'M SAFE — DISMISS
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
  },
  card: {
    width: '100%',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(20,15,30,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.35)',
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#7000FF',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  iconBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  iconRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(112,0,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.4)',
  },
  iconCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7000FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7000FF',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  textBlock: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 320,
  },
  breathingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(57,255,160,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,160,0.2)',
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,32,121,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.2)',
  },
  contactsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  ctaBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sosBtnWrap: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  sosBtn: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    shadowColor: '#FF2079',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  dismissBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
