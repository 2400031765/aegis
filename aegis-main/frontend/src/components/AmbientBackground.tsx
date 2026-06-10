import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
}

export const AmbientBackground = ({ children }: Props) => {
  return (
    <View style={styles.root}>
      <View style={styles.base} pointerEvents="none" />
      <ImageBackground
        source={require('../../assets/images/bg-glow.png')}
        style={[StyleSheet.absoluteFillObject, styles.debugOverlay]}
        imageStyle={styles.glowImage}
        resizeMode="cover"
        pointerEvents="none"
      />
      {/* Top vignette glow (purple) */}
      <LinearGradient
        colors={['rgba(112,0,255,0.35)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.topGlow, styles.debugOverlay]}
        pointerEvents="none"
      />
      {/* Bottom magenta glow */}
      <LinearGradient
        colors={['transparent', 'rgba(255,32,121,0.25)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.bottomGlow, styles.debugOverlay]}
        pointerEvents="none"
      />
      {/* Dark overlay to keep content readable */}
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.base,
  },
  glowImage: {
    opacity: 0.55,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,4,10,0.35)',
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  debugOverlay: {
    backgroundColor: 'rgba(255,0,0,0.2)',
  },
});
