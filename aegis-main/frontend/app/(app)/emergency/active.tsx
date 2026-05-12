import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../../src/components/Text';
import { Waveform } from '../../../src/components/Waveform';
import { GradientButton } from '../../../src/components/GradientButton';
import { useEmergencyStore, formatElapsed } from '../../../src/store/emergencyStore';
import { useContactsStore } from '../../../src/store/contactsStore';
import { useAuthStore } from '../../../src/store/authStore';
import { locationService, formatCoord, formatAccuracy } from '../../../src/services/location';
import { colors, spacing, radii } from '../../../src/theme';

const StatusDot = ({ active }: { active?: boolean }) => {
  const o = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(o, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    ).start();
  }, [o]);
  return (
    <View style={styles.statusDotWrap}>
      <Animated.View
        style={[
          styles.dotPulse,
          {
            opacity: o.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
            transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
          },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: active ? '#39FFA0' : '#FF2079' }]} />
    </View>
  );
};

export default function ActiveEmergencyScreen() {
  const router = useRouter();
  const phase = useEmergencyStore((s) => s.phase);
  const durationMs = useEmergencyStore((s) => s.durationMs);
  const tickDuration = useEmergencyStore((s) => s.tickDuration);
  const location = useEmergencyStore((s) => s.location);
  const permission = useEmergencyStore((s) => s.permissionStatus);
  const setLocation = useEmergencyStore((s) => s.setLocation);
  const refreshLocation = useEmergencyStore((s) => s.refreshLocation);
  const stopAlert = useEmergencyStore((s) => s.stopAlert);
  const sendAlert = useEmergencyStore((s) => s.sendAlert);
  const lastPayload = useEmergencyStore((s) => s.lastPayload);
  const isRecording = useEmergencyStore((s) => s.isRecording);
  const user = useAuthStore((s) => s.user);
  const contacts = useContactsStore((s) => s.contacts);

  const selectedContacts = contacts.filter((c) => c.selectedForSos !== false);

  // Tick duration every second
  useEffect(() => {
    if (phase !== 'active' && phase !== 'sent') return;
    const interval = setInterval(tickDuration, 1000);
    return () => clearInterval(interval);
  }, [phase, tickDuration]);

  // Live location subscription
  useEffect(() => {
    if (permission !== 'granted') return;
    const unsubscribe = locationService.watch((loc) => setLocation(loc), 5000);
    return () => unsubscribe();
  }, [permission, setLocation]);

  // If user navigated here without active phase, kick back
  useEffect(() => {
    if (phase === 'idle') {
      router.replace('/(app)/dashboard');
    }
  }, [phase, router]);

  const onStop = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    stopAlert();
    router.replace('/(app)/dashboard');
  };

  const onSend = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    }
    await sendAlert();
  };

  const elapsed = formatElapsed(durationMs);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#180007', '#1F0010', '#0A0006']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status banner */}
          <View style={styles.statusBanner}>
            <StatusDot active />
            <Text variant="label" color="#FF2079" style={{ letterSpacing: 3 }}>
              EMERGENCY MODE ACTIVE
            </Text>
          </View>

          <Text variant="h2" weight="bold" style={styles.title}>
            You are{'\n'}
            <Text variant="h2" weight="bold" color="#FF2079">protected.</Text>
          </Text>
          <Text variant="bodyBase" color="#E2C4D2" style={styles.subtitle}>
            AEGIS is recording, tracking your location, and ready to alert your trusted circle.
          </Text>

          {/* Live timer */}
          <View style={styles.timerCard}>
            <Text variant="label" color="#FFB0C8" style={{ letterSpacing: 2 }}>ACTIVE FOR</Text>
            <Text style={styles.timerText}>{elapsed}</Text>

            {/* Recording waveform */}
            <View style={styles.recRow}>
              <View style={styles.recDot} />
              <Text variant="label" color="#FFB0C8" style={{ letterSpacing: 2 }}>
                REC · AUDIO CAPTURE PRIMED
              </Text>
            </View>
            <Waveform active={isRecording} bars={32} color="#FF2079" height={48} />
          </View>

          {/* Location card */}
          <View style={styles.locCard}>
            <View style={styles.locHeader}>
              <View style={styles.locIcon}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyBase" weight="bold">Live Location</Text>
                <Text variant="bodySm" color="#E2C4D2">
                  {permission === 'granted'
                    ? 'GPS streaming · Updates every 5s'
                    : permission === 'denied'
                    ? 'Permission denied — tap to retry'
                    : 'Requesting GPS access…'}
                </Text>
              </View>
              <Pressable
                testID="emergency-refresh-location"
                onPress={refreshLocation}
                style={styles.refreshBtn}
                hitSlop={8}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Map placeholder */}
            <View style={styles.mapBox}>
              <LinearGradient
                colors={['rgba(112,0,255,0.25)', 'rgba(255,32,121,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Grid lines */}
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={`h-${i}`} style={[styles.gridLine, { top: `${(i + 1) * 14}%` }]} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 14}%` }]} />
              ))}
              {/* User pin */}
              <View style={styles.pinWrap}>
                <View style={styles.pinPulse} />
                <View style={styles.pinCore}>
                  <Ionicons name="person" size={18} color="#fff" />
                </View>
              </View>
              <Text variant="label" color="#FFB0C8" style={styles.mapBadge}>
                LIVE
              </Text>
            </View>

            <View style={styles.coordsRow}>
              <View style={styles.coordCol}>
                <Text variant="label" color="#FFB0C8">LATITUDE</Text>
                <Text variant="bodyBase" weight="semi">
                  {location ? formatCoord(location.latitude) : '—'}
                </Text>
              </View>
              <View style={styles.coordCol}>
                <Text variant="label" color="#FFB0C8">LONGITUDE</Text>
                <Text variant="bodyBase" weight="semi">
                  {location ? formatCoord(location.longitude) : '—'}
                </Text>
              </View>
              <View style={styles.coordCol}>
                <Text variant="label" color="#FFB0C8">ACCURACY</Text>
                <Text variant="bodyBase" weight="semi">
                  {location ? formatAccuracy(location.accuracy) : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trusted circle */}
          <View style={styles.contactsCard}>
            <View style={styles.contactsHeader}>
              <Ionicons name="people" size={18} color="#FF2079" />
              <Text variant="bodyBase" weight="bold">Trusted Circle</Text>
              <View style={styles.contactsBadge}>
                <Text variant="label" color="#fff">
                  {selectedContacts.length}
                </Text>
              </View>
            </View>
            {selectedContacts.length === 0 ? (
              <Text variant="bodySm" color="#E2C4D2" style={{ marginTop: spacing.sm }}>
                No trusted contacts yet. Add some from the dashboard so AEGIS can alert them.
              </Text>
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {selectedContacts.slice(0, 4).map((c) => (
                  <View key={c.id} style={styles.contactRow}>
                    <View style={styles.avatar}>
                      <Text variant="bodySm" weight="bold">
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySm" weight="semi">{c.name}</Text>
                      <Text variant="label" color="#FFB0C8">{c.phone}</Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text variant="label" color="#fff">QUEUED</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Sent confirmation */}
          {phase === 'sent' && lastPayload ? (
            <View style={styles.sentCard}>
              <Ionicons name="checkmark-circle" size={28} color="#39FFA0" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyBase" weight="bold">Alert payload prepared</Text>
                <Text variant="bodySm" color="#E2C4D2">
                  Live SMS / FCM dispatch ships in Module 5. Payload ready for {selectedContacts.length} contact{selectedContacts.length === 1 ? '' : 's'} as {user?.displayName ?? 'you'}.
                </Text>
              </View>
            </View>
          ) : null}

          {/* CTAs */}
          <View style={styles.ctaCol}>
            <GradientButton
              label="Send Emergency Alert"
              testID="emergency-send-btn"
              onPress={onSend}
              colors={['#FF2079', '#B800E6', '#7000FF']}
              height={64}
            />
            <Pressable
              testID="emergency-stop-btn"
              onPress={onStop}
              style={styles.stopBtn}
            >
              <Ionicons name="stop-circle" size={22} color="#fff" />
              <Text variant="bodyLg" weight="bold" color="#fff">Stop Alert</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0006' },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  statusDotWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2079',
  },
  title: {
    color: '#fff',
  },
  subtitle: {
    maxWidth: 360,
  },
  timerCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,32,121,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.3)',
    gap: spacing.md,
  },
  timerText: {
    color: '#fff',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 56,
    letterSpacing: -1,
    textShadowColor: 'rgba(255,32,121,0.6)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF2079',
    shadowColor: '#FF2079',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  locCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: spacing.md,
  },
  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF2079',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBox: {
    height: 180,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pinWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,32,121,0.25)',
  },
  pinCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF2079',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2079',
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  mapBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,32,121,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  coordCol: {
    flex: 1,
    gap: 4,
  },
  contactsCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactsBadge: {
    backgroundColor: '#FF2079',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,32,121,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(57,255,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,160,0.3)',
  },
  ctaCol: {
    gap: spacing.md,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
