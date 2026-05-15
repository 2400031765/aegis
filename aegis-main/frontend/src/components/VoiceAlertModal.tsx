/**
 * VoiceAlertModal
 * Bottom-sheet style modal for setting / updating the personal safeword phrase.
 * Opened from the Voice Alert card on the dashboard.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from './Text';
import { colors, spacing, radii } from '../theme';
import { useSafewordStore } from '../store/safewordStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const EXAMPLES = [
  'call aunt maya',
  'i forgot my blue notebook',
  'operation cobalt',
  'where is my jacket',
];

export const VoiceAlertModal = ({ visible, onClose }: Props) => {
  const safeword = useSafewordStore((s) => s.safeword);
  const setSafeword = useSafewordStore((s) => s.setSafeword);
  const clearSafeword = useSafewordStore((s) => s.clearSafeword);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sync draft with current safeword when modal opens
  useEffect(() => {
    if (visible) {
      setDraft(safeword);
      setError('');
      setSaved(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start();
    }
  }, [visible, safeword, fadeAnim, slideAnim]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 3) {
      setError('Phrase must be at least 3 characters.');
      return;
    }
    if (trimmed.split(' ').length < 2) {
      setError('Use at least two words so it feels natural.');
      return;
    }
    setError('');
    await setSafeword(trimmed);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleClear = async () => {
    await clearSafeword();
    setDraft('');
    setError('');
  };

  const handleExample = (ex: string) => {
    setDraft(ex);
    setError('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="mic" size={20} color={colors.brand.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBase" weight="bold">
                Voice Alert
              </Text>
              <Text variant="bodySm" color={colors.text.secondary}>
                Set a secret phrase to silently trigger emergency mode
              </Text>
            </View>
            <Pressable
              testID="voice-alert-modal-close"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* How it works */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color="#00F0FF" />
              <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                When you say or type this phrase in the AEGIS AI chat, emergency mode activates silently — no loud alerts, no visible warning.
              </Text>
            </View>

            {/* Current status */}
            {safeword ? (
              <View style={styles.activeRow}>
                <View style={styles.activeDot} />
                <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
                  Active phrase:{' '}
                  <Text variant="bodySm" weight="semi" color="#fff">
                    "{safeword}"
                  </Text>
                </Text>
                <Pressable
                  testID="voice-alert-clear-btn"
                  onPress={handleClear}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.text.tertiary} />
                </Pressable>
              </View>
            ) : null}

            {/* Input */}
            <View style={styles.inputSection}>
              <Text variant="label" color={colors.text.tertiary} style={styles.inputLabel}>
                YOUR SAFEWORD PHRASE
              </Text>
              <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.text.tertiary} />
                <TextInput
                  testID="voice-alert-input"
                  value={draft}
                  onChangeText={(v) => { setDraft(v); setError(''); }}
                  placeholder="e.g. call aunt maya"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                {draft.length > 0 ? (
                  <Pressable onPress={() => { setDraft(''); setError(''); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
                  </Pressable>
                ) : null}
              </View>
              {error ? (
                <Text variant="bodySm" color={colors.status.danger} style={styles.errorText}>
                  {error}
                </Text>
              ) : null}
            </View>

            {/* Example phrases */}
            <View style={styles.examplesSection}>
              <Text variant="label" color={colors.text.tertiary} style={styles.inputLabel}>
                EXAMPLE PHRASES
              </Text>
              <View style={styles.examplesGrid}>
                {EXAMPLES.map((ex) => (
                  <Pressable
                    key={ex}
                    testID={`voice-alert-example-${ex.slice(0, 8).replace(/\s/g, '-')}`}
                    onPress={() => handleExample(ex)}
                    style={[
                      styles.exampleChip,
                      draft === ex && styles.exampleChipActive,
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={11}
                      color={draft === ex ? '#fff' : colors.brand.secondary}
                    />
                    <Text
                      variant="bodySm"
                      color={draft === ex ? '#fff' : colors.text.secondary}
                    >
                      {ex}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsCard}>
              <Text variant="label" color={colors.text.tertiary} style={{ marginBottom: spacing.sm }}>
                TIPS FOR A GOOD SAFEWORD
              </Text>
              {[
                'Use a phrase you would naturally say',
                'Avoid common words like "help" or "danger"',
                'At least two words works best',
                'Only you need to know this phrase',
              ].map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text variant="bodySm" color={colors.text.secondary}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            {/* Save button */}
            <Pressable
              testID="voice-alert-save-btn"
              onPress={handleSave}
              style={styles.saveBtnWrap}
              disabled={saved}
            >
              <LinearGradient
                colors={saved ? ['#39FFA0', '#00C97A'] : ['#7000FF', '#B800E6', '#FF2079']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                {saved ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text variant="bodyBase" weight="bold" color="#fff">
                      Safeword Saved
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" />
                    <Text variant="bodyBase" weight="bold" color="#fff">
                      {safeword ? 'Update Safeword' : 'Save Safeword'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,4,10,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0914',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(112,0,255,0.3)',
    maxHeight: '88%',
    shadowColor: '#7000FF',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,32,121,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(112,0,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.25)',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39FFA0',
    shadowColor: '#39FFA0',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
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
  errorText: {
    paddingHorizontal: spacing.xs,
  },
  examplesSection: {
    gap: spacing.sm,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(184,0,230,0.25)',
  },
  exampleChipActive: {
    backgroundColor: 'rgba(112,0,255,0.35)',
    borderColor: '#7000FF',
  },
  tipsCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand.secondary,
    marginTop: 7,
  },
  saveBtnWrap: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  saveBtn: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
  },
});
