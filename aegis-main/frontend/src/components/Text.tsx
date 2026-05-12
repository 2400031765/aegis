import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '../theme';

type Variant = 'h1' | 'h2' | 'h3' | 'bodyLg' | 'bodyBase' | 'bodySm' | 'label';
type Weight = 'regular' | 'medium' | 'semi' | 'bold' | 'extra';

interface Props extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, TextStyle> = {
  h1: typography.scale.h1,
  h2: typography.scale.h2,
  h3: typography.scale.h3,
  bodyLg: typography.scale.bodyLg,
  bodyBase: typography.scale.bodyBase,
  bodySm: typography.scale.bodySm,
  label: typography.scale.label,
};

const weightToFamily: Record<Weight, string> = {
  regular: typography.family.body,
  medium: typography.family.bodyMed,
  semi: typography.family.bodySemi,
  bold: typography.family.heading,
  extra: typography.family.headingExtra,
};

export const Text = ({ variant = 'bodyBase', weight, color, style, children, ...rest }: Props) => {
  const isHeading = variant === 'h1' || variant === 'h2' || variant === 'h3';
  const resolvedWeight: Weight = weight ?? (variant === 'h1' ? 'extra' : isHeading ? 'bold' : 'regular');
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        variantStyles[variant],
        { fontFamily: weightToFamily[resolvedWeight], color: color ?? colors.text.primary },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.text.primary,
  },
});
