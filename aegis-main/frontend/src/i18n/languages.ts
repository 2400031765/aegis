// AEGIS supported languages — focus on Indian languages + English.
// Add more by extending this list and providing translations in /src/i18n/locales/.

export interface Language {
  code: string;
  name: string;       // Name in English
  native: string;     // Native script
  flag: string;       // emoji flag or country code marker
  rtl?: boolean;
}

export const PRIMARY_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
];

export const ADDITIONAL_LANGUAGES: Language[] = [
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇮🇳', rtl: true },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
];

export const ALL_LANGUAGES: Language[] = [...PRIMARY_LANGUAGES, ...ADDITIONAL_LANGUAGES];

export const findLanguage = (code: string): Language | undefined =>
  ALL_LANGUAGES.find((l) => l.code === code);
