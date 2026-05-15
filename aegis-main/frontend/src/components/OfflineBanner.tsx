/**
 * OfflineBanner
 * Slim, non-intrusive banner that appears below the assistant header when:
 *   - Device is offline  → "Offline Emergency Mode Active"
 *   - Just reconnected   → "Back online — syncing" (auto-dismisses after 4s)
 *
 * Animates in/out smoothly. Does not affect layout of content below it.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { spacing } from '../theme';

interface Props {
  isOnline: boolean;
  wasOffline: boolean;
  queuedCount?: number;
}

export const OfflineBanner = ({ isOnline, wasOffline, queuedCount = 0 }: Props) => {
  const slideAnim = useRef(new Animated.Value(-48)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const shouldShow = !isOnline || wasOffline;

  useEffect(() => {
    if (shouldShow) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -48,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShow, slideAnim, opacityAnim]);

  // Determine banner content
  const isReconnecting = isOnline && wasOffline;

  const bgColor = isReconnecting
    ? 'rgba(57,255,160,0.12)'
    : 'rgba(255,184,0,0.10)';

  const borderColor = isReconnecting
    ? 'rgba(57,255,160,0.35)'
    : 'rgba(255,184,0,0.35)';

  const iconName = isReconnecting ? 'wifi' : 'cloud-offline-outline';
  const iconColor = isReconnecting ? '#39FFA0' : '#FFB800';

  const label = isReconnecting
    ? 'Back online — AEGIS is syncing'
    : 'Offline Emergency Mode Active';

  const sublabel = isReconnecting
    ? queuedCount > 0
      ? `${queuedCount} queued action${queuedCount > 1 ? 's' : ''} will sync now`
      : 'All systems restored'
    : 'Local AI active · SOS & safeword fully functional';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
        <Ionicons
          name={iconName as React.ComponentProps<typeof Ionicons>['name']}
          size={14}
          color={iconColor}
        />
        <View style={styles.textBlock}>
          <Text variant="label" style={{ color: iconColor, letterSpacing: 1 }}>
            {label}
          </Text>
          <Text variant="label" style={styles.sublabel}>
            {sublabel}
          </Text>
        </View>
        {!isOnline ? (
          <View style={[styles.dot, { backgroundColor: '#FFB800' }]} />
        ) : (
          <View style={[styles.dot, { backgroundColor: '#39FFA0' }]} />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // Positioned in normal flow — pushes content down by its height
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  sublabel: {
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
