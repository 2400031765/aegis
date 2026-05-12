import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../../src/components/AmbientBackground';
import { BlendedLogo } from '../../src/components/BlendedLogo';
import { GlassCard } from '../../src/components/GlassCard';
import { GradientButton } from '../../src/components/GradientButton';
import { FormField } from '../../src/components/FormField';
import { Text } from '../../src/components/Text';
import { colors, spacing, radii } from '../../src/theme';
import { useContactsStore } from '../../src/store/contactsStore';

export default function ContactsScreen() {
  const router = useRouter();
  const contacts = useContactsStore((s) => s.contacts);
  const hydrate = useContactsStore((s) => s.hydrate);
  const addContact = useContactsStore((s) => s.addContact);
  const removeContact = useContactsStore((s) => s.removeContact);
  const toggleSelected = useContactsStore((s) => s.toggleSelected);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onAdd = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please enter the contact name.';
    if (phone.trim().length < 6) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await addContact({ name: name.trim(), phone: phone.trim(), relation: relation.trim() || undefined, selectedForSos: true });
    setName('');
    setPhone('');
    setRelation('');
    setAdding(false);
  };

  const confirmRemove = (id: string) => {
    Alert.alert('Remove contact?', 'They will no longer receive AEGIS emergency alerts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeContact(id) },
    ]);
  };

  const selectedCount = contacts.filter((c) => c.selectedForSos !== false).length;

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <Pressable
                testID="contacts-back-btn"
                onPress={() => router.back()}
                style={styles.iconBtn}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </Pressable>
              <View style={styles.brandRow}>
                <BlendedLogo size={36} pulse={false} />
                <Text variant="bodyBase" weight="bold" style={styles.brandText}>
                  AEGIS
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Hero */}
            <View style={styles.hero}>
              <Text variant="label" color={colors.brand.secondary}>Trusted Circle</Text>
              <Text variant="h2" weight="bold" style={{ marginTop: spacing.sm }}>
                Who should{'\n'}
                <Text variant="h2" weight="bold" color={colors.brand.secondary}>know first?</Text>
              </Text>
              <Text variant="bodyBase" color={colors.text.secondary} style={{ marginTop: spacing.sm, maxWidth: 360 }}>
                {contacts.length === 0
                  ? 'Add the people who should be alerted instantly during an emergency.'
                  : `${selectedCount} of ${contacts.length} contacts will be notified when you trigger an SOS.`}
              </Text>
            </View>

            {/* Contacts list */}
            <View style={{ gap: spacing.md }}>
              {contacts.map((c) => {
                const sel = c.selectedForSos !== false;
                return (
                  <GlassCard key={c.id} style={styles.contactCard}>
                    <View style={styles.contactRow}>
                      <View style={[styles.avatar, sel && styles.avatarOn]}>
                        <Text variant="bodyBase" weight="bold">
                          {c.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyBase" weight="semi">{c.name}</Text>
                        <Text variant="bodySm" color={colors.text.secondary}>{c.phone}</Text>
                        {c.relation ? (
                          <Text variant="label" color={colors.text.tertiary}>{c.relation}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        testID={`contact-toggle-${c.id}`}
                        onPress={() => toggleSelected(c.id)}
                        style={[styles.toggle, sel && styles.toggleOn]}
                        hitSlop={6}
                      >
                        <View style={[styles.thumb, sel && styles.thumbOn]} />
                      </Pressable>
                      <Pressable
                        testID={`contact-remove-${c.id}`}
                        onPress={() => confirmRemove(c.id)}
                        style={styles.deleteBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                      </Pressable>
                    </View>
                  </GlassCard>
                );
              })}

              {contacts.length === 0 && !adding ? (
                <GlassCard style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={32} color={colors.brand.secondary} />
                  <Text variant="bodyBase" weight="semi" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                    No trusted contacts yet
                  </Text>
                  <Text variant="bodySm" color={colors.text.secondary} style={{ textAlign: 'center' }}>
                    Add at least one trusted person so AEGIS can alert them in an emergency.
                  </Text>
                </GlassCard>
              ) : null}
            </View>

            {/* Add form */}
            {adding ? (
              <GlassCard style={styles.formCard}>
                <Text variant="bodyBase" weight="bold">New trusted contact</Text>
                <FormField
                  testID="contact-name"
                  label="Name"
                  icon="person-outline"
                  placeholder="e.g. Mom"
                  value={name}
                  onChangeText={setName}
                  error={errors.name}
                />
                <FormField
                  testID="contact-phone"
                  label="Phone"
                  icon="call-outline"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  error={errors.phone}
                />
                <FormField
                  testID="contact-relation"
                  label="Relation (optional)"
                  icon="heart-outline"
                  placeholder="Sister, Friend, Partner…"
                  value={relation}
                  onChangeText={setRelation}
                />
                <View style={styles.formCtas}>
                  <Pressable
                    testID="contact-cancel-btn"
                    onPress={() => setAdding(false)}
                    style={styles.secondaryBtn}
                  >
                    <Text variant="bodyBase" weight="semi">Cancel</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <GradientButton label="Save" testID="contact-save-btn" onPress={onAdd} />
                  </View>
                </View>
              </GlassCard>
            ) : (
              <Pressable testID="contact-add-btn" onPress={() => setAdding(true)}>
                <GlassCard style={styles.addBtn}>
                  <Ionicons name="add-circle" size={22} color={colors.brand.secondary} />
                  <Text variant="bodyBase" weight="semi">
                    Add trusted contact
                  </Text>
                </GlassCard>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: { letterSpacing: 4 },
  hero: { marginTop: spacing.sm },
  contactCard: {
    padding: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: {
    backgroundColor: 'rgba(255,32,121,0.4)',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#FF2079',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  thumbOn: {
    transform: [{ translateX: 18 }],
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  formCtas: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
