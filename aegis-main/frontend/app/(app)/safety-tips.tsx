import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { GlassCard } from '../../src/components/GlassCard';
import { Text } from '../../src/components/Text';
import { colors, spacing, radii } from '../../src/theme';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SECTIONS = [
  {
    id: 'walking-alone',
    title: 'Walking Alone at Night',
    tips: [
      'Stay in well-lit areas',
      'Avoid isolated shortcuts',
      'Share route with trusted contacts',
      'Keep SOS ready',
    ],
  },
  {
    id: 'feeling-followed',
    title: 'Feeling Followed',
    tips: [
      'Enter a public place immediately',
      'Do not go directly home',
      'Share live location',
      'Activate SOS if danger escalates',
    ],
  },
  {
    id: 'cab-safety',
    title: 'Cab / Ride Safety',
    tips: [
      'Verify vehicle details',
      'Share trip information',
      'Sit near exits if uncomfortable',
      'Avoid revealing personal information',
    ],
  },
  {
    id: 'public-transport',
    title: 'Public Transport Safety',
    tips: [
      'Stay near populated sections',
      'Keep valuables secure',
      'Remain aware of surroundings',
      'Avoid isolated compartments',
    ],
  },
  {
    id: 'panic-attack',
    title: 'Panic Attack / Anxiety',
    tips: [
      'Focus on slow breathing',
      'Move toward safe public areas',
      'Contact trusted people',
      'Use calming AI guidance',
    ],
  },
  {
    id: 'domestic-violence',
    title: 'Domestic Violence / Unsafe Environment',
    tips: [
      'Identify safe exits',
      'Contact trusted support',
      'Move toward populated areas if possible',
      'Use emergency SOS discreetly',
    ],
  },
  {
    id: 'stalking',
    title: 'Stalking / Harassment',
    tips: [
      'Avoid isolated routes',
      'Inform someone trusted',
      'Document suspicious activity',
      'Seek public/security assistance',
    ],
  },
  {
    id: 'lost-area',
    title: 'Lost in Unknown Area',
    tips: [
      'Avoid wandering aimlessly',
      'Move toward public landmarks',
      'Share live location',
      'Use SafeWalk navigation',
    ],
  },
  {
    id: 'low-battery',
    title: 'Low Phone Battery',
    tips: [
      'Enable battery saver',
      'Share live location early',
      'Reduce unnecessary app usage',
      'Keep emergency contacts informed',
    ],
  },
  {
    id: 'no-internet',
    title: 'No Internet / Signal Loss',
    tips: [
      'Use offline emergency mode',
      'Keep GPS active if possible',
      'Move toward populated zones',
      'Attempt periodic reconnects',
    ],
  },
  {
    id: 'travel-emergency',
    title: 'Emergency While Traveling',
    tips: [
      'Share journey details',
      'Use SafeWalk monitoring',
      'Keep location access enabled',
      'Save emergency contacts offline',
    ],
  },
  {
    id: 'unsafe-crowd',
    title: 'Unsafe Crowd Situation',
    tips: [
      'Identify exits immediately',
      'Avoid panic movement',
      'Move toward security personnel',
      'Stay near groups/families',
    ],
  },
  {
    id: 'medical-emergency',
    title: 'Medical Emergency Nearby',
    tips: [
      'Contact emergency services',
      'Share precise location',
      'Stay calm and assess surroundings',
      'Avoid unsafe intervention',
    ],
  },
  {
    id: 'natural-disaster',
    title: 'Natural Disaster Situation',
    tips: [
      'Move toward safe shelter',
      'Follow local emergency guidance',
      'Keep emergency communication active',
      'Preserve battery power',
    ],
  },
  {
    id: 'suspicious-stranger',
    title: 'Suspicious Stranger Interaction',
    tips: [
      'Maintain safe distance',
      'Avoid sharing personal details',
      'Move toward public areas',
      'Trust instincts and disengage',
    ],
  },
  {
    id: 'campus-safety',
    title: 'College Campus Safety',
    tips: [
      'Walk with groups at night',
      'Use campus emergency contacts',
      'Share routes during late travel',
      'Avoid isolated campus areas',
    ],
  },
  {
    id: 'child-safety',
    title: 'Child Safety Guidance',
    tips: [
      'Teach emergency contacts',
      'Use location sharing',
      'Identify safe adults/public places',
      'Keep emergency plans prepared',
    ],
  },
  {
    id: 'shelter-guidance',
    title: 'Emergency Shelter Guidance',
    tips: [
      'Identify nearest safe locations',
      'Stay in populated public areas',
      'Keep trusted contacts informed',
      'Avoid isolated unknown spaces',
    ],
  },
  {
    id: 'online-threats',
    title: 'Online Blackmail / Digital Threats',
    tips: [
      'Do not respond impulsively',
      'Preserve evidence/screenshots',
      'Contact trusted support',
      'Report threats appropriately',
    ],
  },
  {
    id: 'sos-guidance',
    title: 'SOS Activation Guidance',
    tips: [
      'Trigger SOS immediately if unsafe',
      'Share live location automatically',
      'Keep calm and move toward public safety',
      'Use emergency evidence recording if necessary',
    ],
  },
];

export default function SafetyTipsScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => (o === id ? null : id));
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: spacing.md }}>
            <Text variant="h2" weight="bold">Adaptive Safety Guidance</Text>
            <Text variant="bodySm" color="#E2C4D2" style={{ marginTop: spacing.xs }}>Real-world emergency preparedness and personal safety assistance powered by AEGIS.</Text>
          </View>

          {SECTIONS.map((s) => (
            <Pressable key={s.id} onPress={() => toggle(s.id)}>
              <GlassCard style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBase" weight="semi">{s.title}</Text>
                    <Text variant="label" color={colors.text.secondary} numberOfLines={1}>{s.tips[0]}</Text>
                  </View>
                  <Ionicons name={open === s.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
                </View>

                {open === s.id && (
                  <View style={styles.tipsList}>
                    {s.tips.map((t) => (
                      <View key={t} style={styles.tipRow}>
                        <View style={styles.bullet} />
                        <Text variant="bodySm">{t}</Text>
                      </View>
                    ))}
                    <View style={{ height: spacing.sm }} />
                    <Text variant="label" color={colors.text.secondary}>If you feel unsafe, trigger SOS and follow the in-app guidance. AEGIS can share your live location and evidence with selected contacts.</Text>
                  </View>
                )}
              </GlassCard>
            </Pressable>
          ))}

        </ScrollView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.xl, gap: spacing.md },
  sectionCard: { padding: spacing.md, marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: 'rgba(255,32,121,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,32,121,0.25)' },
  tipsList: { marginTop: spacing.md, gap: spacing.sm },
  tipRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB0C8', marginTop: 6 },
});
