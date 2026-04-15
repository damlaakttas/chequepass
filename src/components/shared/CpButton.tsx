import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  Animated, ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Radius } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label:     string;
  onPress:   () => void;
  variant?:  Variant;
  loading?:  boolean;
  disabled?: boolean;
  style?:    ViewStyle;
  icon?:     React.ReactNode;
}

export function CpButton({
  label, onPress, variant = 'primary', loading, disabled, style, icon,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  const bg = {
    primary:   Colors.brand,
    secondary: 'transparent',
    ghost:     Colors.yellow,
    danger:    Colors.error,
  }[variant];

  const textColor = {
    primary:   '#fff',
    secondary: Colors.textSecondary,
    ghost:     Colors.textPrimary,
    danger:    '#fff',
  }[variant];

  const borderColor = variant === 'secondary' ? Colors.border : 'transparent';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading || disabled}
        activeOpacity={0.85}
        style={[
          styles.btn,
          { backgroundColor: bg, borderColor, borderWidth: variant === 'secondary' ? 1.5 : 0 },
          style,
        ]}
      >
        {loading
          ? <ActivityIndicator color={textColor} size="small" />
          : (
            <>
              {icon}
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            </>
          )
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height:         52,
    borderRadius:   Radius.md,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  label: {
    fontFamily: Typography.fontBodySem,
    fontSize:   15,
  },
});
