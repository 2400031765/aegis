/**
 * SafewordSetupCard
 * Lets the user set or update their personal safeword phrase.
 * Designed to be embedded in any screen (dashboard, settings, etc.)
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from './Text';
import { GlassCard } from './GlassCard';
import { colors, spacing, radii } from '../theme';
import { useSafewordStore } from '../store/safewordStore';

interface Props {
  /** Called after a safeword is saved or cleared */
  onSaved?: (phrase: string) => void;
}

export const SafewordSetupCard = ({ onSaved }: Props) => {
  const safeword = useSafewordStore((s) => s.safeword);
  const setSafeword = useSafewordStore((s) => s.setSafeword);
  const clearSafeword = useSafewordStore((s) => s.clearSafeword);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const startEdit = () => {
    setDraft(safeword);
    setEditing(true);
    setSaved(false);
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 3) {
      Alert.alert(
        'Too short',
        'Your safeword phrase must be at least 3 characters.',
        [{ text: 'OK' }],
      );
      return;
    }
    await setSafeword(trimmed);
    setEditing(false);
    setSaved(true);
    onSaved?.(trimmed);
    // Reset saved indicator after 2s
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    Alert.alert(
      'Remove safeword?',
      'Your personal safeword phrase will be deleted. You can set a new one anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearSafeword();
            setEditing(false);
            setDraft('');
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft('');
  };

  return (
    <GlassCard style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="key" size={18} color={colors.brand.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBase" weight="semi">
            Personal Safeword
          </Text>
          <Text variant="bodySm" color={colors.text.secondary}>
            {safeword
              ? 'Active — say this phrase to trigger emergency mode'
              : 'Set a secret phrase to silently trigger emergency mode'}
          </Text>
        </View>
        {saved ? (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark" size={14} color="#39FFA0" />
            <Text variant="label" color="#39FFA0">
              SAVED
            </Text>
          </View>
        ) : null}
      </View>

      {/* Current safeword display */}
      {safeword && !editing ? (
        <View style={styles.activeRow}>
          <View style={styles.activeDot} />
          <Text variant="bodySm" color={colors.text.secondary} style={{ flex: 1 }}>
            Phrase:{' '}
            <Text variant="bodySm" weight="semi" color="#fff">
              "{safeword}"
            </Text>
          </Text>
        </View>
      ) : null}

      {/* Edit input */}
      {editing ? (
        <View style={styles.inputBlock}>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.text.tertiary} />
            <TextInput
              testID="safeword-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="e.g. call aunt maya"
              placeholderTextColor={colors.text.tertiary}
              style={styles.textInput}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          <Text variant="label" color={colors.text.tertiary} style={styles.hint}>
            Choose something natural — a phrase only you would say
          </Text>
          <View style={styles.editActions}>
            <Pressable
              testID="safeword-save-btn"
              onPress={handleSave}
              style={styles.saveBtn}
            >
              <LinearGradient
                colors={['#7000FF', '#B800E6', '#FF2079']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtnGradient}
              >
                <Text variant="label" color="#fff">
                  SAVE PHRASE
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              testID="safeword-cancel-btn"
              onPress={handleCancel}
              style={styles.cancelBtn}
            >
              <Text variant="label" color={colors.text.secondary}>
                CANCEL
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.ctaRow}>
          <Pressable
            testID="safeword-edit-btn"
            onPress={startEdit}
            style={styles.editBtn}
          >
            <Ionicons
              name={safeword ? 'pencil' : 'add-circle-outline'}
              size={14}
              color={colors.brand.secondary}
            />
            <Text variant="label" color={colors.brand.secondary}>
              {safeword ? 'CHANGE PHRASE' : 'SET SAFEWORD'}
            </Text>
          </Pressable>
          {safeword ? (
            <Pressable
              testID="safeword-clear-btn"
              onPress={handleClear}
              style={styles.clearBtn}
            >
              <Ionicons name="trash-outline" size={14} color={colors.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,32,121,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(57,255,160,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,160,0.3)',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(112,0,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.2)',
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
  inputBlock: {
    gap: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.4)',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    paddingVertical: 0,
  },
  hint: {
    paddingHorizontal: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  cancelBtn: {
    height: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,32,121,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
