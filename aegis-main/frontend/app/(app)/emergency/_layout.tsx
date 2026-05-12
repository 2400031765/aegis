import { Stack } from 'expo-router';
import { colors } from '../../../src/theme';

export default function EmergencyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: false,
        contentStyle: { backgroundColor: '#0A0006' },
      }}
    >
      <Stack.Screen name="countdown" />
      <Stack.Screen name="active" />
    </Stack>
  );
}
