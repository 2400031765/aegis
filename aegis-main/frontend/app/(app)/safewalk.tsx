import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { GlassCard } from '../../src/components/GlassCard';
import { GradientButton } from '../../src/components/GradientButton';
import { Text } from '../../src/components/Text';
import { Waveform } from '../../src/components/Waveform';
import { colors, spacing, radii } from '../../src/theme';
import {
  useSafeWalkStore,
  formatWalkDuration,
  formatEtaRemaining,
} from '../../src/store/safewalkStore';
import { useEmergencyStore } from '../../src/store/emergencyStore';
import { useContactsStore } from '../../src/store/contactsStore';

// ─── ETA options ──────────────────────────────────────────────────────────────
const ETA_OPTIONS = [
  { label: 'No ETA', value: 0 },
  { label: '10 min', value: 10 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

// ─── Calming messages ─────────────────────────────────────────────────────────
const MONITORING_MESSAGES = [
  "I'm monitoring your journey.",
  'Stay aware of your surroundings.',
  'You are not alone.',
  'AEGIS is with you every step.',
  'Trust your instincts.',
  'Stay in well-lit areas.',
];

const ESCALATION_MESSAGES = [
  'Are you safe? Please respond.',
  'I noticed your ETA has passed.',
  'Do you need assistance?',
  'Stay calm — I am still here.',
];

export default function SafeWalkScreen() {
  const router = useRouter();
  const phase = useSafeWalkStore((s) => s.phase);
  const session = useSafeWalkStore((s) => s.session);
  const start = useSafeWalkStore((s) => s.start);
  const tick = useSafeWalkStore((s) => s.tick);
  const confirmSafe = useSafeWalkStore((s) => s.confirmSafe);
  const complete = useSafeWalkStore((s) => s.complete);
  const cancel = useSafeWalkStore((s) => s.cancel);
  const acknowledgeEscalation = useSafeWalkStore((s) => s.acknowledgeEscalation);
  const refreshLocation = useSafeWalkStore((s) => s.refreshLocation);

  const startCountdown = useEmergencyStore((s) => s.startCountdown);
  const contacts = useContactsStore((s) => s.contacts);
  const selectedContacts = contacts.filter((c) => c.selectedForSos !== false);

  // Setup form state
  const [destination, setDestination] = useState('');
  const [note, setNote] = useState('');
  const [etaMinutes, setEtaMinutes] = useState(20);
  const [destError, setDestError] = useState('');

  // Rotating message index
  const [msgIdx, setMsgIdx] = useState(0);

  // Pulse animation for active dot
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [fadeAnim]);

  // Pulse animation for status dot
  useEffect(() => {
    if (phase !== 'active' && phase !== 'escalated') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulseAnim]);

  // Tick interval — 1 second
  useEffect(() => {
    if (phase !== 'active' && phase !== 'escalated') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  // Rotate monitoring message every 8 seconds
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MONITORING_MESSAGES.length);
    }, 8000);
    return () => clearInterval(id);
  }, [phase]);

  // Haptic on escalation
  useEffect(() => {
    if (phase === 'escalated' && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [phase]);

  const onStartWalk = async () => {
    if (!destination.trim()) {
      setDestError('Please enter your destination.');
      return;
    }
    setDestError('');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    await start({ destination: destination.trim(), note: note.trim(), etaMinutes });
  };

  const onSOS = () => {
    startCountdown();
    router.push('/(app)/emergency/countdown');
  };

  const onComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    complete();
  };

  const onCancel = () => {
    cancel();
    router.back();
  };

  const dotColor = phase === 'escalated' ? '#FFB800' : '#39FFA0';
  const dotScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  // ── COMPLETED STATE ──────────────────────────────────────────────────────────
  if (phase === 'completed' && session) {
    return (
      <AmbientBackground>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View style={[styles.completedWrap, { opacity: fadeAnim }]}>
            {/* Success icon */}
            <View style={styles.successRing}>
              <LinearGradient
                colors={['rgba(57,255,160,0.2)', 'rgba(57,255,160,0.05)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.successCore}>
                <Ionicons name="checkmark" size={48} color="#39FFA0" />
              </View>
            </View>

            <Text variant="h2" weight="bold" style={{ textAlign: 'center', marginTop: spacing.lg }}>
              Journey Completed{'\n'}
              <Text variant="h2" weight="bold" color="#39FFA0">Safely.</Text>
            </Text>

            <Text variant="bodyBase" color={colors.text.secondary} style={styles.centeredText}>
              Glad you arrived safely. AEGIS monitoring has ended.
            </Text>

            {/* Summary card */}
            <GlassCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="navigate" size={16} color={colors.brand.secondary} />
                <Text variant="bodySm" color={colors.text.secondary}>Destination</Text>
                <Text variant="bodySm" weight="semi" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
                  {session.destination}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time" size={16} color={colors.brand.secondary} />
                <Text variant="bodySm" color={colors.text.secondary}>Duration</Text>
                <Text variant="bodySm" weight="semi" style={{ flex: 1, textAlign: 'right' }}>
                  {formatWalkDuration(session.elapsedMs)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="shield-checkmark" size={16} color="#39FFA0" />
                <Text variant="bodySm" color={colors.text.secondary}>Safety Status</Text>
                <Text variant="bodySm" weight="semi" color="#39FFA0" style={{ flex: 1, textAlign: 'right' }}>
                  SAFE
                </Text>
              </View>
              {session.note ? (
                <View style={styles.summaryRow}>
                  <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
                  <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                    {session.note}
                  </Text>
                </View>
              ) : null}
            </GlassCard>

            <GradientButton
              label="Back to Dashboard"
              testID="safewalk-done-btn"
              onPress={() => {
                useSafeWalkStore.setState({ phase: 'idle', session: null });
                router.replace('/(app)/dashboard');
              }}
              colors={['#39FFA0', '#00C97A']}
              height={56}
            />
          </Animated.View>
        </SafeAreaView>
      </AmbientBackground>
    );
  }

  // ── ACTIVE / ESCALATED STATE ─────────────────────────────────────────────────
  if ((phase === 'active' || phase === 'escalated') && session) {
    const escalMsg = ESCALATION_MESSAGES[session.escalationCount % ESCALATION_MESSAGES.length];

    return (
      <AmbientBackground>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.statusBadge}>
                <Animated.View style={[
                  styles.statusDotPulse,
                  { backgroundColor: dotColor, transform: [{ scale: dotScale }], opacity: dotOpacity },
                ]} />
                <View style={[styles.statusDotCore, { backgroundColor: dotColor }]} />
                <Text variant="label" style={{ color: dotColor, letterSpacing: 2 }}>
                  {phase === 'escalated' ? 'CHECK IN REQUIRED' : 'SAFEWALK ACTIVE'}
                </Text>
              </View>
            </View>

            {/* Destination + timer */}
            <View style={styles.destBlock}>
              <Text variant="h3" weight="bold" numberOfLines={1}>
                {session.destination}
              </Text>
              {session.note ? (
                <Text variant="bodySm" color={colors.text.secondary}>{session.note}</Text>
              ) : null}
            </View>

            {/* Timer card */}
            <GlassCard style={styles.timerCard}>
              <View style={styles.timerRow}>
                <View style={styles.timerBlock}>
                  <Text variant="label" color={colors.text.tertiary}>ELAPSED</Text>
                  <Text style={styles.timerText}>{formatWalkDuration(session.elapsedMs)}</Text>
                </View>
                {session.etaMinutes > 0 ? (
                  <>
                    <View style={styles.timerDivider} />
                    <View style={styles.timerBlock}>
                      <Text variant="label" color={phase === 'escalated' ? '#FFB800' : colors.text.tertiary}>
                        {phase === 'escalated' ? 'ETA PASSED' : 'ETA LEFT'}
                      </Text>
                      <Text style={[styles.timerText, phase === 'escalated' && { color: '#FFB800' }]}>
                        {formatEtaRemaining(session.remainingMs)}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
              <Waveform active={phase === 'active'} bars={28} color={phase === 'escalated' ? '#FFB800' : '#39FFA0'} height={32} />
            </GlassCard>

            {/* Escalation warning */}
            {phase === 'escalated' ? (
              <GlassCard style={styles.escalationCard} borderColor="rgba(255,184,0,0.4)">
                <View style={styles.escalationHeader}>
                  <Ionicons name="warning" size={20} color="#FFB800" />
                  <Text variant="bodyBase" weight="bold" color="#FFB800">
                    {escalMsg}
                  </Text>
                </View>
                <Text variant="bodySm" color={colors.text.secondary}>
                  Stay calm — I am still monitoring your safety. Help can be prepared if needed.
                </Text>
                <View style={styles.escalationActions}>
                  <Pressable
                    testID="safewalk-im-safe-btn"
                    onPress={acknowledgeEscalation}
                    style={styles.safeBtn}
                  >
                    <LinearGradient
                      colors={['#39FFA0', '#00C97A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.safeBtnGradient}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#000" />
                      <Text variant="label" style={{ color: '#000', letterSpacing: 1 }}>I AM SAFE</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable
                    testID="safewalk-need-help-btn"
                    onPress={onSOS}
                    style={styles.helpBtn}
                  >
                    <Ionicons name="alert-circle" size={16} color="#FF2079" />
                    <Text variant="label" color="#FF2079" style={{ letterSpacing: 1 }}>NEED HELP</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ) : null}

            {/* Check-in prompt (during active, not escalated) */}
            {phase === 'active' && session.checkInDue ? (
              <GlassCard style={styles.checkInCard} borderColor="rgba(112,0,255,0.4)">
                <View style={styles.checkInRow}>
                  <Ionicons name="heart" size={16} color={colors.brand.secondary} />
                  <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                    Quick check-in — are you doing okay?
                  </Text>
                  <Pressable
                    testID="safewalk-checkin-btn"
                    onPress={confirmSafe}
                    style={styles.checkInBtn}
                    hitSlop={8}
                  >
                    <Text variant="label" color="#39FFA0">ALL GOOD</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ) : null}

            {/* AI monitoring message */}
            <GlassCard style={styles.aiCard}>
              <View style={styles.aiRow}>
                <View style={styles.aiDot} />
                <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                  {MONITORING_MESSAGES[msgIdx]}
                </Text>
              </View>
            </GlassCard>

            {/* Trusted contacts */}
            {selectedContacts.length > 0 ? (
              <GlassCard style={styles.contactsCard}>
                <View style={styles.contactsHeader}>
                  <Ionicons name="people" size={16} color={colors.brand.secondary} />
                  <Text variant="bodySm" weight="semi">Trusted Circle</Text>
                  <View style={styles.contactsBadge}>
                    <Text variant="label" color="#fff">{selectedContacts.length}</Text>
                  </View>
                </View>
                <View style={styles.contactsList}>
                  {selectedContacts.slice(0, 3).map((c) => (
                    <View key={c.id} style={styles.contactChip}>
                      <View style={styles.contactAvatar}>
                        <Text variant="label" color="#fff">{c.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text variant="label" color={colors.text.secondary}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}

            {/* CTAs */}
            <View style={styles.ctaCol}>
              <GradientButton
                label="I Arrived Safely"
                testID="safewalk-complete-btn"
                onPress={onComplete}
                colors={['#39FFA0', '#00C97A']}
                height={60}
              />
              <Pressable
                testID="safewalk-sos-btn"
                onPress={onSOS}
                style={styles.sosBtn}
              >
                <Ionicons name="alert" size={18} color="#FF2079" />
                <Text variant="bodyBase" weight="bold" color="#FF2079">Activate SOS</Text>
              </Pressable>
              <Pressable
                testID="safewalk-cancel-btn"
                onPress={onCancel}
                style={styles.cancelBtn}
              >
                <Text variant="label" color={colors.text.tertiary}>Cancel SafeWalk</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </AmbientBackground>
    );
  }

  // ── SETUP STATE (idle) ────────────────────────────────────────────────────────
  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Header */}
              <View style={styles.header}>
                <Pressable
                  testID="safewalk-back-btn"
                  onPress={() => router.back()}
                  style={styles.backBtn}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerTitle}>
                  <Ionicons name="walk" size={20} color={colors.brand.secondary} />
                  <Text variant="bodyBase" weight="bold" style={{ letterSpacing: 2 }}>SAFEWALK</Text>
                </View>
                <View style={{ width: 40 }} />
              </View>

              {/* Hero */}
              <View style={styles.heroBlock}>
                <Text variant="h2" weight="bold">
                  Where are you{'\n'}
                  <Text variant="h2" weight="bold" color={colors.brand.secondary}>headed?</Text>
                </Text>
                <Text variant="bodyBase" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
                  AEGIS will monitor your journey and alert your trusted circle if needed.
                </Text>
              </View>

              {/* Destination input */}
              <View style={styles.inputSection}>
                <Text variant="label" color={colors.text.tertiary} style={styles.inputLabel}>
                  DESTINATION
                </Text>
                <View style={[styles.inputWrap, destError ? styles.inputWrapError : null]}>
                  <Ionicons name="navigate-outline" size={16} color={colors.text.tertiary} />
                  <TextInput
                    testID="safewalk-destination-input"
                    value={destination}
                    onChangeText={(v) => { setDestination(v); setDestError(''); }}
                    placeholder="e.g. Home, Hostel, Library…"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.textInput}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {destError ? (
                  <Text variant="bodySm" color={colors.status.danger}>{destError}</Text>
                ) : null}
              </View>

              {/* Travel note */}
              <View style={styles.inputSection}>
                <Text variant="label" color={colors.text.tertiary} style={styles.inputLabel}>
                  TRAVEL NOTE (OPTIONAL)
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
                  <TextInput
                    testID="safewalk-note-input"
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Taking the main road"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.textInput}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* ETA selector */}
              <View style={styles.inputSection}>
                <Text variant="label" color={colors.text.tertiary} style={styles.inputLabel}>
                  ESTIMATED ARRIVAL TIME
                </Text>
                <View style={styles.etaGrid}>
                  {ETA_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      testID={`safewalk-eta-${opt.value}`}
                      onPress={() => setEtaMinutes(opt.value)}
                      style={[
                        styles.etaChip,
                        etaMinutes === opt.value && styles.etaChipActive,
                      ]}
                    >
                      <Text
                        variant="bodySm"
                        weight={etaMinutes === opt.value ? 'semi' : 'regular'}
                        color={etaMinutes === opt.value ? '#fff' : colors.text.secondary}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Info card */}
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#39FFA0" />
                  <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                    AEGIS will monitor your journey and check in every 5 minutes.
                  </Text>
                </View>
                {selectedContacts.length > 0 ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="people" size={14} color={colors.brand.secondary} />
                    <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                      {selectedContacts.length} trusted contact{selectedContacts.length > 1 ? 's' : ''} ready to be alerted.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={14} color={colors.text.tertiary} />
                    <Text variant="bodySm" color={colors.text.tertiary} style={{ flex: 1 }}>
                      Add trusted contacts from the dashboard for alerts.
                    </Text>
                  </View>
                )}
              </GlassCard>

              {/* Start button */}
              <GradientButton
                label="Start SafeWalk"
                testID="safewalk-start-btn"
                onPress={onStartWalk}
                height={60}
              />

              <Pressable
                testID="safewalk-setup-cancel-btn"
                onPress={() => router.back()}
                style={styles.cancelSetupBtn}
              >
                <Text variant="label" color={colors.text.tertiary}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Setup ────────────────────────────────────────────────────────────────────
  heroBlock: {
    marginTop: spacing.sm,
  },
  inputSection: {
    gap: spacing.sm,
  },
  inputLabel: {
    letterSpacing: 1.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.35)',
  },
  inputWrapError: {
    borderColor: colors.status.danger,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    paddingVertical: 0,
  },
  etaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  etaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  etaChipActive: {
    backgroundColor: 'rgba(112,0,255,0.35)',
    borderColor: '#7000FF',
  },
  infoCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cancelSetupBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  // ── Active ───────────────────────────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  statusDotPulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  statusDotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  destBlock: {
    gap: spacing.xs,
  },
  timerCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  timerBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  timerDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timerText: {
    color: '#fff',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 40,
    letterSpacing: -1,
  },
  escalationCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  escalationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  escalationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  safeBtn: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  safeBtnGradient: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
  },
  helpBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.4)',
    backgroundColor: 'rgba(255,32,121,0.08)',
  },
  checkInCard: {
    padding: spacing.md,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkInBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(57,255,160,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,160,0.3)',
  },
  aiCard: {
    padding: spacing.md,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39FFA0',
    shadowColor: '#39FFA0',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  contactsCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactsBadge: {
    backgroundColor: colors.brand.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  contactsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  contactAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,32,121,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCol: {
    gap: spacing.md,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,32,121,0.5)',
    backgroundColor: 'rgba(255,32,121,0.08)',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  // ── Completed ────────────────────────────────────────────────────────────────
  completedWrap: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(57,255,160,0.4)',
    overflow: 'hidden',
  },
  successCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(57,255,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
    maxWidth: 300,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
