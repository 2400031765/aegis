import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../../src/components/Text';
import { useEmergencyStore } from '../../../src/store/emergencyStore';
import { colors, spacing, radii } from '../../../src/theme';

export default function CountdownScreen() {
  const router = useRouter();
  const phase = useEmergencyStore((s) => s.phase);
  const countdown = useEmergencyStore((s) => s.countdown);
  const tick = useEmergencyStore((s) => s.tickCountdown);
  const cancel = useEmergencyStore((s) => s.cancelCountdown);
  const activate = useEmergencyStore((s) => s.activate);

  const ringPulse = useRef(new Animated.Value(0)).current;
  const numScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(ringPulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ).start();
  }, [ringPulse]);

  // Tick once per second
  useEffect(() => {
    if (phase !== 'countdown') return;
    const interval = setInterval(() => {
      tick();
      // Number bounce per tick
      Animated.sequence([
        Animated.timing(numScale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
        Animated.timing(numScale, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, tick, numScale]);

  // When countdown hits zero → activate
  useEffect(() => {
    if (phase === 'countdown' && countdown <= 0) {
      activate().then(() => {
        router.replace('/(app)/emergency/active');
      });
    }
  }, [countdown, phase, activate, router]);

  // If user cancelled outside, go back
  useEffect(() => {
    if (phase === 'cancelled' || phase === 'idle') {
      const timer = setTimeout(() => router.back(), 200);
      return () => clearTimeout(timer);
    }
  }, [phase, router]);

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#180007', '#2D0014', '#420022']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <Text variant="label" color="#FF99B8" style={styles.alertingLabel}>
              ALERTING IN
            </Text>
            <Text variant="bodyBase" color={colors.text.secondary} style={styles.subtitle}>
              Your trusted contacts will be notified, your live location shared,
              and Smart Emergency Mode activated.
            </Text>
          </View>

          <View style={styles.timerWrap}>
            <Animated.View
              style={[
                styles.ring,
                {
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                styles.ring2,
                {
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
            <View style={styles.coreCircle}>
              <Animated.Text
                style={[styles.bigNumber, { transform: [{ scale: numScale }] }]}
              >
                {countdown}
              </Animated.Text>
              <Text variant="label" color="#FFB0C8" style={{ marginTop: 4 }}>
                SECONDS
              </Text>
            </View>
          </View>

          <Pressable
            testID="countdown-cancel-btn"
            onPress={cancel}
            style={styles.cancelBtn}
          >
            <Ionicons name="close" size={22} color="#fff" />
            <Text variant="bodyLg" weight="bold" color="#fff">
              Cancel Alert
            </Text>
          </Pressable>

          <Text variant="bodySm" color="#FFB0C8" style={styles.holdHint}>
            False alarm? Tap cancel any time before the timer ends.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#180007' },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  alertingLabel: {
    letterSpacing: 4,
    fontSize: 14,
  },
  subtitle: {
    marginTop: spacing.md,
    textAlign: 'center',
    maxWidth: 320,
    color: '#E2C4D2',
  },
  timerWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: '#FF2079',
  },
  ring2: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderColor: '#B800E6',
  },
  coreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF2079',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2079',
    shadowOpacity: 0.9,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 30,
  },
  bigNumber: {
    color: '#fff',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 110,
    lineHeight: 118,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 64,
    width: '100%',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  holdHint: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
