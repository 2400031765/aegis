import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

const en = {
  common: {
    continue: 'Continue',
    back: 'Back',
    cancel: 'Cancel',
    skip: 'Skip',
    or: 'or',
    seeMore: 'More languages',
    seeLess: 'Show fewer',
  },
  splash: {
    welcomeTo: 'Welcome to',
    tagline: 'ADAPTIVE EMERGENCY GUIDANCE AND INTELLIGENCE SECURITY',
    forSafety: 'FOR THE SAFETY OF WOMEN AROUND THE WORLD',
    aiDesc:
      'AEGIS is an AI-powered safety companion designed to protect, guide and empower women in every situation.',
    youAreNotAlone: 'YOU ARE NOT ALONE. AEGIS IS WITH YOU.',
    getStarted: 'GET STARTED',
    privacy: 'By continuing you agree to our Privacy & Safety Pledge',
    features: {
      sos: 'Smart Emergency\nResponse',
      threat: 'AI-Powered\nThreat Detection',
      walk: 'SafeWalk\nCompanion',
      location: 'Real-time\nLocation Sharing',
    },
  },
  language: {
    eyebrow: 'Step 1 of 3',
    title: 'Choose your',
    titleAccent: 'language.',
    subtitle: 'AEGIS speaks your language during emergencies. You can change this anytime.',
    autoDetected: 'Detected from your device',
  },
  auth: {
    welcomeBack: 'Welcome Back',
    welcomeBackSub: 'Stay safe. Stay fearless.',
    createAccount: 'Create your account',
    createAccountSub: 'Join AEGIS — your personal safety companion.',
    forgot: 'Forgot password?',
    forgotTitle: 'Reset your password',
    forgotSub: 'Enter your email and we will send you a secure reset link.',
    email: 'Email address',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    fullName: 'Full name',
    login: 'Log In',
    signup: 'Create Account',
    signupCta: 'Sign Up',
    signinCta: 'Sign In',
    google: 'Continue with Google',
    guest: 'Continue as Guest',
    sendReset: 'Send Reset Link',
    resetSent: 'Reset link sent. Check your inbox.',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    invalidEmail: 'Please enter a valid email address.',
    weakPassword: 'Password must be at least 6 characters.',
    mismatch: 'Passwords do not match.',
    nameRequired: 'Please enter your full name.',
    genericError: 'Something went wrong. Please try again.',
    demoMode:
      'Running in demo mode — Firebase is not configured yet. Authentication will use local storage only.',
  },
};

// Stub locales — for now reuse English. Real translations can be added later
// in /src/i18n/locales/{code}.ts following the same shape.
const stub = en;

export const i18n = new I18n({
  en,
  hi: stub,
  te: stub,
  ta: stub,
  bn: stub,
  kn: stub,
  mr: stub,
});

const detected = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.locale = detected;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const setLocale = (code: string) => {
  i18n.locale = code;
};

export const getDeviceLocale = () => detected;
