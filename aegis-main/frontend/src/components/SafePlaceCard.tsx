import React from 'react';
import { View, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { GlassCard } from './GlassCard';
import { SAFE_PLACE_META, type SafePlace } from '../services/ai';
import { colors, spacing, radii } from '../theme';

const openInMaps = (place: SafePlace) => {
  const lat = place.latitude;
  const lon = place.longitude;
  const label = encodeURIComponent(place.name);
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${lat},${lon}`,
    android: `geo:0,0?q=${lat},${lon}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
  }) as string;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
  });
};

interface Props {
  place: SafePlace;
  highlighted?: boolean;
  guidance?: string | null;
}

/** Premium safe-place card surfaced inside the AI assistant chat. */
export const SafePlaceCard = ({ place, highlighted, guidance }: Props) => {
  const meta = SAFE_PLACE_META[place.type] ?? SAFE_PLACE_META.public_area;

  return (
    <GlassCard
      style={[styles.card, highlighted && styles.cardHighlighted]}
      borderColor={highlighted ? '#FF2079' : undefined}
    >
      {highlighted ? (
        <LinearGradient
          colors={['rgba(255,32,121,0.18)', 'rgba(112,0,255,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: meta.color + '22', borderColor: meta.color + '66' }]}>
          <Ionicons
            name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={22}
            color={meta.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text variant="bodyBase" weight="bold" numberOfLines={1}>
              {place.name}
            </Text>
            {highlighted ? (
              <View style={styles.recommendedPill}>
                <Ionicons name="navigate" size={10} color="#fff" />
                <Text variant="label" color="#fff" style={{ letterSpacing: 1 }}>
                  RECOMMENDED
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="label" color={colors.text.tertiary}>
            {meta.label.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="walk" size={12} color={colors.text.secondary} />
          <Text variant="bodySm" color={colors.text.secondary}>
            {place.distance_m} m
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="compass" size={12} color={colors.text.secondary} />
          <Text variant="bodySm" color={colors.text.secondary}>
            to your {place.direction}
          </Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.dot, { backgroundColor: place.open_now ? '#39FFA0' : '#888' }]} />
          <Text variant="bodySm" color={place.open_now ? '#39FFA0' : colors.text.tertiary}>
            {place.open_now ? 'Open now' : 'Closed'}
          </Text>
        </View>
      </View>

      {guidance && highlighted ? (
        <View style={styles.guidanceBlock}>
          <Ionicons name="trail-sign" size={14} color="#FF2079" />
          <Text variant="bodySm" style={styles.guidanceText}>
            {guidance}
          </Text>
        </View>
      ) : null}

      <Pressable
        testID={`safeplace-nav-${place.id}`}
        onPress={() => openInMaps(place)}
        style={styles.navBtn}
      >
        <LinearGradient
          colors={highlighted ? ['#FF2079', '#B800E6', '#7000FF'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.navGradient}
        >
          <Ionicons
            name="navigate"
            size={14}
            color={highlighted ? '#fff' : colors.brand.secondary}
          />
          <Text
            variant="bodySm"
            weight="bold"
            style={{ color: highlighted ? '#fff' : colors.text.primary, letterSpacing: 0.5 }}
          >
            Navigate to Safety
          </Text>
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardHighlighted: {
    borderWidth: 1.5,
    shadowColor: '#FF2079',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recommendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FF2079',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  guidanceBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,32,121,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,32,121,0.25)',
  },
  guidanceText: {
    flex: 1,
    color: '#fff',
    lineHeight: 18,
  },
  navBtn: {
    marginTop: spacing.xs,
  },
  navGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radii.pill,
  },
});
