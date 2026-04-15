import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { Colors, Typography, Radius } from '../../theme';

interface Props extends TextInputProps {
  label:       string;
  error?:      string;
  icon?:       React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function CpTextField({
  label, error, icon, isPassword, containerStyle, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={[
        styles.field,
        focused && styles.fieldFocused,
        !!error && styles.fieldError,
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPw}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          placeholderTextColor={Colors.textHint}
          cursorColor={Colors.brand}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:      { marginBottom: 14 },
  label:        { ...Typography.caption, marginBottom: 5, color: Colors.textMuted },
  field: {
    height:          52,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    paddingHorizontal: 14,
  },
  fieldFocused: { borderColor: Colors.brand },
  fieldError:   { borderColor: Colors.error },
  icon:         { marginRight: 10 },
  input: {
    flex:       1,
    fontFamily: Typography.fontBody,
    fontSize:   15,
    color:      Colors.textPrimary,
    padding:    0,
  },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 16 },
  error: {
    ...Typography.bodySm,
    color:     Colors.error,
    marginTop: 4,
  },
});
