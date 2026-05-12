import React, { useRef, useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Animated,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radii, spacing } from '../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  error?: string | null;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FormField = ({
  label,
  icon,
  error,
  isPassword,
  containerStyle,
  testID,
  value,
  onFocus,
  onBlur,
  ...rest
}: Props) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!isPassword);
  const glow = useRef(new Animated.Value(0)).current;

  const animateTo = (to: number) =>
    Animated.timing(glow, { toValue: to, duration: 220, useNativeDriver: false }).start();

  const borderColor = error
    ? '#FF5577'
    : glow.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.08)', 'rgba(184,0,230,0.6)'],
      });

  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text variant="label" color={focused ? colors.brand.secondary : colors.text.tertiary}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.field,
          {
            borderColor,
            shadowColor: '#7000FF',
            shadowOpacity,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.brand.secondary : colors.text.tertiary}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          {...rest}
          testID={testID}
          value={value}
          placeholderTextColor={colors.text.tertiary}
          secureTextEntry={isPassword && hidden}
          autoCapitalize={isPassword ? 'none' : rest.autoCapitalize}
          autoCorrect={false}
          onFocus={(e) => {
            setFocused(true);
            animateTo(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            animateTo(0);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            testID={(testID ?? 'pwd') + '-toggle'}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.text.tertiary}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text variant="bodySm" color="#FF5577" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    paddingVertical: 0,
  },
  error: {
    paddingLeft: spacing.xs,
  },
});
