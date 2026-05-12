import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Animated, Easing, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  size?: number;
  onPress: () => void;
  testID?: string;
  label?: string;
  hint?: string;
}

/**
 * Large, glowing, perpetually-pulsing SOS button.
 * Triggers strong haptic feedback on press.
 */
export const SOSButton = ({ size = 220, onPress, testID, label = 'SOS', hint }: Props) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Outer rings expand outward continuously
    Animated.loop(
      Animated.timing(ringPulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ).start();
  }, [pulse, ringPulse]);

  const innerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const innerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const onPressIn = () => {
    Animated.spring(press, { toValue: 0.94, useNativeDriver: true, friction: 7 }).start();
  };
  const onPressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  };

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // ignore
      }
    }
    onPress();
  };

  return (
    <View style={[styles.wrap, { width: size * 1.7, height: size * 1.7 }]}>
      {/* Expanding outer rings */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: (size * 1.4) / 2,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.outerRing2,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: (size * 1.2) / 2,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [{ scale: Animated.multiply(innerScale, press) }],
          opacity: innerOpacity,
        }}
      >
        <Pressable
          testID={testID ?? 'sos-button'}
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.pressArea, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <LinearGradient
            colors={['#FF2079', '#B800E6', '#7000FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <View style={styles.inner}>
              <Ionicons name="alert" size={size * 0.18} color="#fff" />
              <Text
                style={{
                  fontFamily: 'Outfit_800ExtraBold',
                  fontSize: size * 0.22,
                  color: '#fff',
                  letterSpacing: 2,
                  marginTop: 4,
                }}
              >
                {label}
              </Text>
              {hint ? (
                <Text
                  variant="label"
                  color="rgba(255,255,255,0.9)"
                  style={{ marginTop: 8, letterSpacing: 1.5 }}
                >
                  {hint}
                </Text>
              ) : null}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,32,121,0.55)',
  },
  outerRing2: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(184,0,230,0.45)',
  },
  pressArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2079',
    shadowOpacity: 0.85,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 30,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
