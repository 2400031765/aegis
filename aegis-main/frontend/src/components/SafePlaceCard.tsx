import React from 'react';
import { View, StyleSheet, Pressable, Platform, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { GlassCard } from './GlassCard';
import { SAFE_PLACE_META, type SafePlace } from '../services/ai';
import { openNavigation, buildMapsNavigationUrl, formatDistance, bearingToRelative } from '../services/navigationService';
import { colors, spacing, radii } from '../theme';

interface Props {
  place: SafePlace;
  highlighted?: boolean;
  guidance?: string | null;
  /** User's current GPS coordinates — enables accurate turn-by-turn directions */
  userLat?: number | null;
  userLon?: number | null;
}

/** Premium safe-place card surfaced inside the AI assistant chat. */
export const SafePlaceCard = ({ place, highlighted, guidance, userLat, userLon }: Props) => {
  const meta = SAFE_PLACE_META[place.type] ?? SAFE_PLACE_META.public_area;

  const handleNavigate = async () => {
    await openNavigation(place, userLat, userLon);
  };

  const handleCopyLink = () => {
    const url = buildMapsNavigationUrl(place, userLat, userLon);
    // Clipboard API — works on both native and web
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(url).catch(() => undefined);
    } else {
      Clipboard.setString(url);
    }
  };

  const hasRealCoords = place.latitude !== 0 || place.longitude !== 0;
  const distLabel = formatDistance(place.distance_m);
  const relDir = bearingToRelative(place.bearing_deg);

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

      {/* Header row */}
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
            <Text variant="bodyBase" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
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

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="walk" size={12} color={colors.text.secondary} />
          <Text variant="bodySm" color={colors.text.secondary}>
            {distLabel}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="compass" size={12} color={colors.text.secondary} />
          <Text variant="bodySm" color={colors.text.secondary}>
            {relDir}
          </Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.dot, { backgroundColor: place.open_now ? '#39FFA0' : '#888' }]} />
          <Text variant="bodySm" color={place.open_now ? '#39FFA0' : colors.text.tertiary}>
            {place.open_now ? 'Open now' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Vicinity */}
      {place.vicinity ? (
        <View style={styles.vicinityRow}>
          <Ionicons name="location-outline" size={11} color={colors.text.tertiary} />
          <Text variant="label" color={colors.text.tertiary} numberOfLines={1}>
            {place.vicinity}
          </Text>
        </View>
      ) : null}

      {/* Directional guidance block */}
      {guidance && highlighted ? (
        <View style={styles.guidanceBlock}>
          <Ionicons name="trail-sign" size={14} color="#FF2079" />
          <Text variant="bodySm" style={styles.guidanceText}>
            {guidance}
          </Text>
        </View>
      ) : null}

      {/* Calming support strip — only on highlighted/recommended card */}
      {highlighted ? (
        <View style={styles.calmingStrip}>
          <Ionicons name="heart" size={12} color={colors.brand.secondary} />
          <Text variant="label" color={colors.brand.secondary} style={{ letterSpacing: 0.8 }}>
            You are not alone · AEGIS is with you
          </Text>
        </View>
      ) : null}

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        <Pressable
          testID={`safeplace-nav-${place.id}`}
          onPress={handleNavigate}
          style={styles.navBtnWrap}
        >
          <LinearGradient
            colors={highlighted ? ['#FF2079', '#B800E6', '#7000FF'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.navBtn}
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
              {hasRealCoords ? 'Open in Maps' : 'Search in Maps'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Copy link button — always available as fallback */}
        <Pressable
          testID={`safeplace-copy-${place.id}`}
          onPress={handleCopyLink}
          style={styles.copyBtn}
          hitSlop={8}
        >
          <Ionicons name="copy-outline" size={15} color={colors.text.tertiary} />
        </Pressable>
      </View>
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
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vicinityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  calmingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  navBtnWrap: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radii.pill,
  },
  copyBtn: {
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
