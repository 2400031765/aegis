import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEmergencyStore, formatElapsed } from '../store/emergencyStore';
import useRecordingStore from '../store/recordingStore';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { colors, radii, spacing } from '../theme';

const formatTimestamp = (value: number) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const EmergencyRecordingBanner = () => {
  const insets = useSafeAreaInsets();
  const phase = useEmergencyStore((s) => s.phase);
  const isRecording = useRecordingStore((s) => s.isRecording);
  const durationMs = useRecordingStore((s) => s.durationMs);
  const recordingInfo = useRecordingStore((s) => s.recordingInfo);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [lastSavedUri, setLastSavedUri] = useState<string | null>(null);
  const router = useRouter();

  const showActive =
    isRecording && (phase === 'active' || phase === 'sent');

  // REMOVED saved bottom popup completely
  // Only active recording banner remains

  useEffect(() => {
    if (!showActive) {
      useRecordingStore
        .getState()
        .stopPlayback()
        .catch(() => undefined);
    }
  }, [showActive]);

  const timestamp = useMemo(() => {
    if (!recordingInfo) return null;
    return formatTimestamp(
      recordingInfo.stoppedAt ?? recordingInfo.startedAt
    );
  }, [recordingInfo]);

  // ONLY show while actively recording
  if (!showActive) return null;

  const onStopPress = async () => {
    // stop via emergency flow so app state remains consistent
    await useEmergencyStore
      .getState()
      .stopAlert()
      .catch(() => undefined);
  };

  const onHistoryPress = () => {
    router.push('/(app)/recordings');
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom:
            // keep fixed floating position above input bar
            168,
        },
      ]}
    >
      <View
        pointerEvents="box-none"
        style={[
          styles.panel,
          showActive
            ? styles.activePanel
            : styles.toastPanel,
        ]}
      >
        <View style={styles.liveHeader}>
          <View style={styles.recDot} />

          <View style={{ flex: 1 }}>
            <Text
              variant="bodySm"
              weight="bold"
              color="#fff"
            >
              Recording evidence
            </Text>

            <Text
              variant="label"
              color="#FFB0C8"
            >
              {formatElapsed(durationMs)}
            </Text>
          </View>

          <Pressable
            pointerEvents="auto"
            onPress={onStopPress}
            style={styles.stopBtn}
            hitSlop={8}
          >
            <Ionicons
              name="stop"
              size={16}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    // Floating indicator above chat input so it never overlaps controls
    bottom: 168,
    zIndex: 50,
  },

  panel: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(24,0,7,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.45)',
    shadowColor: '#FF2079',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  activePanel: {
    minHeight: 64,
  },

  toastPanel: {
    minHeight: 56,
  },

  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  toastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF2079',
    shadowColor: '#FF2079',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  toastDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF2079',
    shadowColor: '#FF2079',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,32,121,0.12)',
  },

  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});