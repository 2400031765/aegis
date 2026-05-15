import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/Text';
import useRecordingStore from '../../src/store/recordingStore';
import { formatRecordingDuration } from '../../src/services/audioService';
import { colors, spacing } from '../../src/theme';

export default function RecordingsScreen() {
  const recordings = useRecordingStore((s) => s.recordings);
  const play = useRecordingStore((s) => s.play);
  const stopPlayback = useRecordingStore((s) => s.stopPlayback);
  const [playingUri, setPlayingUri] = useState<string | null>(null);

  const renderItem = ({ item }: { item: any }) => {
    const ts = new Date(item.stoppedAt ?? item.startedAt).toLocaleString();
    const onPlay = async () => {
      if (playingUri === item.uri) {
        await stopPlayback();
        setPlayingUri(null);
        return;
      }
      setPlayingUri(item.uri);
      await play(item.uri, () => setPlayingUri(null)).catch(() => setPlayingUri(null));
    };

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBase" weight="semi">{item.filename}</Text>
          <Text variant="label" color="#E2C4D2">{ts} • {formatRecordingDuration(item.durationMs ?? 0)}</Text>
        </View>
        <Pressable onPress={onPlay} style={styles.playBtn} hitSlop={8}>
          <Ionicons name={playingUri === item.uri ? 'stop' : 'play'} size={20} color="#fff" />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="h2" weight="bold">Evidence History</Text>
        <Text variant="label" color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
          Review saved emergency recordings by timestamp and duration.
        </Text>
      </View>
      <FlatList
        data={recordings}
        keyExtractor={(i) => i.uri}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<Text variant="bodySm" color="#E2C4D2" style={{ padding: spacing.md }}>No saved recordings yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.base },
  header: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.secondary,
  },
});
