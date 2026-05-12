import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
  pulse?: boolean;
  /** Soft horizontal cinematic glow underneath the icon */
  cinematic?: boolean;
}

/**
 * AEGIS logo blended into the dark UI without any white container.
 * - Uses transparent shield-icon PNG.
 * - Subtle radial purple/pink aura behind the icon.
 * - Optional cinematic horizontal glow strip (premium AI brand feel).
 */
export const BlendedLogo = ({ size = 96, style, pulse = true, cinematic = false }: Props) => {
  const aspect = 753 / 551;
  const w = size * aspect;
  const h = size;

  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [glow, pulse]);

  const auraScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const auraOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] });

  return (
    <View style={[styles.wrap, { width: w, height: h }, style]}>
      {/* Cinematic horizontal glow strip behind logo */}
      {cinematic ? (
        <View style={[styles.cinematicWrap, { width: w * 2.2, height: h * 1.1 }]}>
          <LinearGradient
            colors={['transparent', 'rgba(184,0,230,0.35)', 'rgba(255,32,121,0.25)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      {/* Soft pulsing radial aura */}
      <Animated.View
        style={[
          styles.aura,
          {
            width: w * 1.6,
            height: h * 1.6,
            borderRadius: (w * 1.6) / 2,
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      {/* The logo itself */}
      <Image
        source={require('../../assets/images/aegis-icon.png')}
        style={{ width: w, height: h, zIndex: 2 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    backgroundColor: 'rgba(112,0,255,0.18)',
    shadowColor: '#7000FF',
    shadowOpacity: 0.9,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
  cinematicWrap: {
    position: 'absolute',
    overflow: 'hidden',
    opacity: 0.9,
  },
});
