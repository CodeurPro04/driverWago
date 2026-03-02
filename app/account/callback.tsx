import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { DriverColors } from '@/constants/driverTheme';

export default function DriverAuthCallbackScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={DriverColors.primary} />
      <Text style={styles.text}>Finalisation de la connexion...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DriverColors.background,
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: DriverColors.muted,
  },
});
