import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAegisFonts } from '../src/hooks/useAegisFonts';
import { useAuthStore } from '../src/store/authStore';
import { useContactsStore } from '../src/store/contactsStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const fontsLoaded = useAegisFonts();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateContacts = useContactsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateContacts();
  }, [hydrate, hydrateContacts]);

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
