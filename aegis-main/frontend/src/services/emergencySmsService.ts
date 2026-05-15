import * as SMS from 'expo-sms';
import type { AegisLocation } from './location';
import type { TrustedContact } from '../store/contactsStore';

const SMS_OPEN_COOLDOWN_MS = 15000;

let lastSmsOpenedAt = 0;

const normalizePhoneNumber = (phone: string) => {
  const trimmed = phone.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return digits ? `${hasLeadingPlus ? '+' : ''}${digits}` : '';
};

export const buildEmergencyMapsLink = (location: AegisLocation | null) => {
  if (!location) return null;
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
};

export const buildEmergencySmsMessage = (location: AegisLocation | null) => {
  const mapsLink = buildEmergencyMapsLink(location);

  if (!mapsLink) {
    return [
      'AEGIS ALERT: I may be in danger.',
      'My live location could not be attached because GPS permission is unavailable.',
      'Please contact me immediately.',
    ].join('\n');
  }

  return [
    'AEGIS ALERT: I may be in danger.',
    'My live location:',
    mapsLink,
    'Please contact me immediately.',
  ].join('\n');
};

const getContactNumbers = (contacts: TrustedContact[]) =>
  contacts
    .filter((contact) => contact.selectedForSos !== false)
    .map((contact) => normalizePhoneNumber(contact.phone))
    .filter(Boolean);

export const openEmergencySmsComposer = async ({
  contacts,
  location,
}: {
  contacts: TrustedContact[];
  location: AegisLocation | null;
}) => {
  const now = Date.now();
  if (now - lastSmsOpenedAt < SMS_OPEN_COOLDOWN_MS) {
    return { opened: false, reason: 'cooldown' as const };
  }

  const recipients = getContactNumbers(contacts);
  if (recipients.length === 0) {
    return { opened: false, reason: 'no_recipients' as const };
  }

  const available = await SMS.isAvailableAsync().catch(() => false);
  if (!available) {
    return { opened: false, reason: 'sms_unavailable' as const };
  }

  try {
    lastSmsOpenedAt = now;
    const result = await SMS.sendSMSAsync(
      recipients,
      buildEmergencySmsMessage(location),
    );

    return { opened: true, result };
  } catch {
    lastSmsOpenedAt = 0;
    return { opened: false, reason: 'open_failed' as const };
  }
};
