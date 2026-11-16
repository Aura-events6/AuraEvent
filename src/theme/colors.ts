/**
 * Aura Design System - Colors & Semantic Tokens
 * Derived from UI/UX Pro Max Royal Luxury Glassmorphism
 */

import { Platform } from 'react-native';

export const colors = {
  // Royal Champagne Gold Scale
  gold: {
    50: '#FCF9F2',
    100: '#F7EFE0',
    200: '#EFE0C2',
    300: '#E4C998',
    400: '#D6AE6B', // Champagne highlight & Dark mode accent
    500: '#C69749', // True Royal Gold (Borders, active nodes)
    600: '#B07E34', // Deep Rich Gold (Light mode text/icons)
    700: '#8E6227',
    800: '#6F4D22',
    900: '#583E1D',
  },

  // Primary Button Gradient
  goldGradient: ['#D6AE6B', '#B8863B'] as const,

  // Ambient Screen Gradients (Apple Style - Luxury Minimal)
  lightGradient: ['#FCFBF9', '#F5F1EA', '#EFECE6'] as const,
  darkGradient: ['#101012', '#141417', '#18171A'] as const,

  // Light Mode Tokens
  light: {
    background: '#FCFBF9',
    backgroundSecondary: '#F5F1EA',
    backgroundTertiary: '#EFECE6',
    card: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.72)' : '#FFFFFF',
    cardBorder: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    input: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : '#FFFFFF',
    inputBorder: 'rgba(198, 151, 73, 0.28)',
    text: '#1C1917',
    textMuted: 'rgba(28, 25, 23, 0.55)',
    textSubtle: 'rgba(28, 25, 23, 0.40)',
    accent: '#B07E34',
    accentBg: 'rgba(198, 151, 73, 0.15)',
    border: 'rgba(198, 151, 73, 0.15)',
    shadow: 'rgba(28, 25, 23, 0.06)',
    freeSlotBorder: 'rgba(198, 151, 73, 0.45)',
  },

  // Dark Mode Tokens (Obsidian Charcoal Glass)
  dark: {
    background: '#101012',
    backgroundSecondary: '#151416',
    card: 'rgba(35, 33, 30, 0.82)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    input: 'rgba(39, 39, 42, 0.85)',
    inputBorder: 'rgba(255, 255, 255, 0.10)',
    text: '#FAFAFA',
    textMuted: 'rgba(250, 250, 250, 0.55)',
    textSubtle: 'rgba(250, 250, 250, 0.40)',
    accent: '#D6AE6B',
    accentBg: 'rgba(214, 174, 107, 0.12)',
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.55)',
    freeSlotBorder: 'rgba(214, 174, 107, 0.35)',
  },

  // Semantic Status Colors (Mode-Aware Lifted Values)
  status: {
    success: {
      light: '#10B981',
      dark: '#34D399',
      bgLight: 'rgba(16, 185, 129, 0.15)',
      bgDark: 'rgba(52, 211, 153, 0.15)',
    },
    danger: {
      light: '#EF4444',
      dark: '#F87171',
      bgLight: 'rgba(239, 68, 68, 0.15)',
      bgDark: 'rgba(248, 113, 113, 0.15)',
    },
    warning: {
      light: '#F59E0B',
      dark: '#FBBF24',
      bgLight: 'rgba(245, 158, 11, 0.15)',
      bgDark: 'rgba(251, 191, 36, 0.15)',
    },
    info: {
      light: '#6366F1',
      dark: '#A5B4FC',
      bgLight: 'rgba(99, 102, 241, 0.15)',
      bgDark: 'rgba(165, 180, 252, 0.15)',
    },
  },
};

export type ThemeMode = 'light' | 'dark';

