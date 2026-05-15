import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAegisFonts } from '../src/hooks/useAegisFonts';
import { useAuthStore } from '../src/store/authStore';
import { useContactsStore } from '../src/store/contactsStore';
import { useEmergencyStore } from '../src/store/emergencyStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const fontsLoaded = useAegisFonts();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateContacts = useContactsStore((s) => s.hydrate);
  const hydrateRecording = useEmergencyStore((s) => s.hydrateRecording);

  useEffect(() => {
    hydrate();
    hydrateContacts();
    hydrateRecording();
  }, [hydrate, hydrateContacts, hydrateRecording]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand.secondary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background.base },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="language" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
