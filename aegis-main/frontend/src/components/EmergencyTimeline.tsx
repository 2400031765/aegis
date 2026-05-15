import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radii } from '../theme';
import { useEmergencyStore } from '../store/emergencyStore';
import { Ionicons } from '@expo/vector-icons';

export const EmergencyTimeline = () => {
  const timeline = useEmergencyStore((s) => s.timeline);
  const phase = useEmergencyStore((s) => s.phase);

  const renderItem = ({ item }: { item: any }) => {
    const ts = new Date(item.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return (
      <View style={styles.row}>
        <View style={styles.dotWrap}>
          <View style={styles.dot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodySm" weight="semi">{ts} — {item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="bodySm" weight="bold" color="#fff">Emergency Timeline</Text>
        <View style={styles.statusWrap}>
          <View style={[styles.pulse, phase === 'active' ? styles.pulseActive : undefined]} />
          <Text variant="label" color="#FFB0C8">{phase === 'active' ? 'Emergency Session Active' : 'Inactive'}</Text>
        </View>
      </View>
      <FlatList
        data={timeline}
        keyExtractor={(i) => String(i.ts)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        contentContainerStyle={{ paddingVertical: spacing.sm }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(24,0,7,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.45)',
    shadowColor: '#FF2079',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,32,121,0.25)' },
  pulseActive: { backgroundColor: '#FF2079' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dotWrap: { width: 28, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB0C8' },
});

export default EmergencyTimeline;
