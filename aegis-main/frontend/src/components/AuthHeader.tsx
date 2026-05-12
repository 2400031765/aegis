import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlendedLogo } from './BlendedLogo';
import { Text } from './Text';
import { colors, spacing, radii } from '../theme';

interface Props {
  title: string;
  subtitle: string;
  showBack?: boolean;
}

export const AuthHeader = ({ title, subtitle, showBack = true }: Props) => {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        {showBack ? (
          <Pressable
            testID="auth-back-btn"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.brandRow}>
          <BlendedLogo size={36} pulse={false} />
          <Text variant="bodyBase" weight="bold" style={styles.brandText}>
            AEGIS
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroLogo}>
        <BlendedLogo size={88} cinematic />
      </View>

      <Text variant="h2" weight="bold" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyBase" color={colors.text.secondary} style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
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
  heroLogo: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 360,
    alignSelf: 'center',
  },
});
