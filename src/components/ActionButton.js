import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export function ActionButton({ icon, onPress, color = '#16a34a', size = 'large' }) {
  const buttonSize = size === 'large' ? 72 : 56;
  const iconSize = size === 'large' ? 36 : 28;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color, width: buttonSize, height: buttonSize }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon name={icon} size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
}

export function LargeActionButton({ icon, label, onPress, color = '#16a34a' }) {
  return (
    <TouchableOpacity
      style={[styles.largeButton, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon name={icon} size={48} color="#fff" style={styles.largeButtonIcon} />
      <View style={styles.largeButtonTextContainer}>
        <Text style={styles.largeButtonText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  largeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  largeButtonIcon: {
    marginRight: 16,
  },
  largeButtonTextContainer: {
    flex: 1,
  },
  largeButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
});
