import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { EmergencyRecordingBanner } from '../../src/components/EmergencyRecordingBanner';

export default function AppLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background.base },
        }}
      >
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="contacts" />
        <Stack.Screen name="assistant" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="safewalk" />
      </Stack>
      <EmergencyRecordingBanner />
    </>
  );
}
