import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { BlendedLogo } from '../../src/components/BlendedLogo';
import { Text } from '../../src/components/Text';
import { Waveform } from '../../src/components/Waveform';
import { GlassCard } from '../../src/components/GlassCard';
import { SafePlaceCard } from '../../src/components/SafePlaceCard';
import { colors, spacing, radii } from '../../src/theme';
import { useChatStore, type ChatMsg } from '../../src/store/chatStore';
import { ACTION_LABELS, type Risk, type AIAction } from '../../src/services/ai';
import { useEmergencyStore } from '../../src/store/emergencyStore';

const RISK_STYLES: Record<Risk, { label: string; color: string; bg: string }> = {
  low: { label: 'LOW RISK', color: '#39FFA0', bg: 'rgba(57,255,160,0.12)' },
  medium: { label: 'MEDIUM RISK', color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  high: { label: 'HIGH RISK', color: '#FF2079', bg: 'rgba(255,32,121,0.18)' },
};

const TypingDots = () => {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(v, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
      );
    const a1 = make(a, 0);
    const b1 = make(b, 150);
    const c1 = make(c, 300);
    a1.start(); b1.start(); c1.start();
    return () => { a1.stop(); b1.stop(); c1.stop(); };
  }, [a, b, c]);

  return (
    <View style={styles.typingRow}>
      {[a, b, c].map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const RiskBadge = ({ risk }: { risk?: Risk }) => {
  if (!risk) return null;
  const s = RISK_STYLES[risk];
  return (
    <View style={[styles.riskBadge, { backgroundColor: s.bg, borderColor: s.color }]}>
      <View style={[styles.riskDot, { backgroundColor: s.color }]} />
      <Text variant="label" style={{ color: s.color, letterSpacing: 1.5 }}>
        {s.label}
      </Text>
    </View>
  );
};

const ActionChip = ({
  action,
  onPress,
  primary,
}: {
  action: AIAction;
  onPress: () => void;
  primary?: boolean;
}) => {
  const meta = ACTION_LABELS[action];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionChip, primary && styles.actionChipPrimary]}
      testID={`ai-action-${action}`}
    >
      <Ionicons
        name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
        size={14}
        color={primary ? '#fff' : colors.brand.secondary}
      />
      <Text
        variant="label"
        style={{ color: primary ? '#fff' : colors.text.primary, letterSpacing: 0.5 }}
      >
        {meta.label}
      </Text>
    </Pressable>
  );
};

const MessageBubble = ({
  msg,
  onAction,
}: {
  msg: ChatMsg;
  onAction: (a: AIAction) => void;
}) => {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.row, { justifyContent: 'flex-end' }]}>
        <LinearGradient
          colors={['#7000FF', '#B800E6', '#FF2079']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text variant="bodyBase" style={{ color: '#fff' }}>
            {msg.content}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <BlendedLogo size={28} pulse={false} />
      </View>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <RiskBadge risk={msg.risk} />
        <GlassCard style={styles.assistantBubble}>
          <Text variant="bodyBase" style={styles.assistantText}>
            {msg.content}
          </Text>
          {msg.reassurance ? (
            <View style={styles.subBlock}>
              <Ionicons name="heart" size={12} color={colors.brand.secondary} />
              <Text variant="bodySm" color={colors.text.secondary}>
                {msg.reassurance}
              </Text>
            </View>
          ) : null}
          {msg.breathing ? (
            <View style={styles.subBlock}>
              <Ionicons name="leaf" size={12} color="#39FFA0" />
              <Text variant="bodySm" color={colors.text.secondary}>
                {msg.breathing}
              </Text>
            </View>
          ) : null}
        </GlassCard>
        {msg.actions && msg.actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {msg.actions.slice(0, 4).map((a, i) => (
              <ActionChip
                key={a + i}
                action={a}
                primary={a === 'activate_emergency_mode'}
                onPress={() => onAction(a)}
              />
            ))}
          </View>
        ) : null}

        {msg.recommendedPlace ? (
          <SafePlaceCard
            place={msg.recommendedPlace}
            highlighted
            guidance={msg.guidance}
          />
        ) : null}

        {msg.nearbyPlaces && msg.nearbyPlaces.length > 0 ? (
          <View>
            <Text variant="label" color={colors.text.tertiary} style={{ marginBottom: spacing.sm, letterSpacing: 1.5 }}>
              OTHER NEARBY SAFE ZONES
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyScroll}
            >
              {msg.nearbyPlaces
                .filter((p) => !msg.recommendedPlace || p.id !== msg.recommendedPlace.id)
                .slice(0, 5)
                .map((p) => (
                  <View key={p.id} style={{ width: 240 }}>
                    <SafePlaceCard place={p} />
                  </View>
                ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const SUGGESTIONS = [
  'I feel unsafe right now',
  'Someone is following me',
  'I think I’m in danger',
  'I’m scared to walk home',
];

export default function AssistantScreen() {
  const router = useRouter();
  const messages = useChatStore((s) => s.messages);
  const thinking = useChatStore((s) => s.thinking);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const consumeStealth = useChatStore((s) => s.consumeStealth);
  const reset = useChatStore((s) => s.reset);
  const startCountdown = useEmergencyStore((s) => s.startCountdown);
  const activate = useEmergencyStore((s) => s.activate);

  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<unknown>(null);

  // Auto-scroll on new message
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, thinking]);

  // Stealth handling: silently activate emergency mode after assistant response
  useEffect(() => {
    if (consumeStealth()) {
      // Give the user 2.5s to see the calm reply, then silently activate.
      const t = setTimeout(async () => {
        await activate();
        router.replace('/(app)/emergency/active');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [messages, consumeStealth, activate, router]);

  const onSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || thinking) return;
    setInput('');
    await sendUserMessage(value);
  };

  const onAction = (action: AIAction) => {
    if (action === 'activate_emergency_mode') {
      startCountdown();
      router.push('/(app)/emergency/countdown');
    }
  };

  /**
   * Web SpeechRecognition for voice input. On native, taps just toggle a
   * "listening" UI; final transcription will land in Module 5 with whisper-1.
   */
  const startListening = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SR =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      if (SR) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec = new (SR as any)();
        rec.lang = 'en-IN';
        rec.continuous = false;
        rec.interimResults = true;
        rec.onresult = (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => {
          let txt = '';
          for (let i = 0; i < e.results.length; i += 1) {
            txt += e.results[i][0].transcript;
          }
          setInput(txt);
        };
        rec.onend = () => {
          setListening(false);
          if (input.trim().length > 0) onSend(input);
        };
        rec.onerror = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
        return;
      }
    }
    // Native fallback — just toggle listening UI for now
    setListening((v) => !v);
  };

  const stopListening = () => {
    setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = recognitionRef.current as any;
    try { r?.stop?.(); } catch { /* ignore */ }
    if (input.trim()) onSend(input);
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              testID="ai-back-btn"
              onPress={() => router.back()}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </Pressable>
            <View style={styles.titleBlock}>
              <View style={styles.titleRow}>
                <BlendedLogo size={28} pulse={false} />
                <Text variant="bodyBase" weight="bold" style={{ letterSpacing: 4 }}>
                  AEGIS AI
                </Text>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text variant="label" color={colors.text.tertiary}>
                  ADAPTIVE · CALM · LISTENING
                </Text>
              </View>
            </View>
            <Pressable
              testID="ai-reset-btn"
              onPress={reset}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="refresh" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} onAction={onAction} />
            ))}
            {thinking ? (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <BlendedLogo size={28} pulse={false} />
                </View>
                <View style={styles.thinkingBubble}>
                  <TypingDots />
                  <Text variant="label" color={colors.text.tertiary} style={{ marginLeft: spacing.sm }}>
                    AEGIS is thinking…
                  </Text>
                </View>
              </View>
            ) : null}

            {messages.length <= 1 && !thinking ? (
              <View style={styles.suggestionsBlock}>
                <Text variant="label" color={colors.text.tertiary} style={{ marginBottom: spacing.sm }}>
                  TRY SAYING
                </Text>
                <View style={styles.suggestionsGrid}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      testID={`ai-suggestion-${s.slice(0, 8).replace(/\s/g, '-')}`}
                      onPress={() => onSend(s)}
                      style={styles.suggestionChip}
                    >
                      <Ionicons name="sparkles" size={12} color={colors.brand.secondary} />
                      <Text variant="bodySm">{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Listening overlay */}
          {listening ? (
            <View style={styles.listeningBar}>
              <Waveform active={listening} bars={28} color={colors.brand.secondary} height={32} />
              <Text variant="label" color={colors.brand.secondary} style={{ marginTop: spacing.xs, letterSpacing: 2 }}>
                LISTENING · WHISPER OK
              </Text>
            </View>
          ) : null}

          {/* Input */}
          <View style={styles.inputBar}>
            <View style={styles.textWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text.tertiary} />
              <TextInput
                testID="ai-input"
                value={input}
                onChangeText={setInput}
                placeholder="Tell AEGIS what's happening…"
                placeholderTextColor={colors.text.tertiary}
                style={styles.textInput}
                onSubmitEditing={() => onSend()}
                returnKeyType="send"
              />
              {input.length > 0 ? (
                <Pressable testID="ai-send-btn" onPress={() => onSend()}>
                  <Ionicons name="send" size={18} color={colors.brand.secondary} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              testID="ai-mic-btn"
              onPress={listening ? stopListening : startListening}
              style={[styles.micBtn, listening && styles.micBtnActive]}
            >
              <LinearGradient
                colors={listening ? ['#FF2079', '#B800E6'] : ['#7000FF', '#B800E6', '#FF2079']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micGradient}
              >
                <Ionicons name={listening ? 'stop' : 'mic'} size={22} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { alignItems: 'center', gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  onlineDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#39FFA0',
    shadowColor: '#39FFA0', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(184,0,230,0.15)',
    borderWidth: 1, borderColor: 'rgba(184,0,230,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  userBubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    shadowColor: '#7000FF', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  assistantBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    gap: spacing.sm,
  },
  assistantText: { color: '#fff', lineHeight: 22 },
  subBlock: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingTop: spacing.xs,
  },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionChipPrimary: {
    backgroundColor: '#FF2079', borderColor: '#FF2079',
    shadowColor: '#FF2079', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, borderTopLeftRadius: 4,
  },
  typingRow: { flexDirection: 'row', gap: 6 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.secondary },
  suggestionsBlock: { marginTop: spacing.lg },
  nearbyScroll: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(184,0,230,0.3)',
  },
  listeningBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(255,32,121,0.08)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,32,121,0.3)',
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    height: 56, borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1, color: '#fff',
    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14,
    paddingVertical: 0,
  },
  micBtn: { width: 56, height: 56 },
  micBtnActive: {
    shadowColor: '#FF2079', shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  micGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7000FF', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
});
