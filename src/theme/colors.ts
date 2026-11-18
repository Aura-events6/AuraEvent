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

  // Primary Button Gradients (135deg Metallic Champagne Gold)
  goldGradient: ['#D6AE6B', '#B8863B'] as const,
  goldGradientDark: ['#DFB978', '#C29142'] as const,

  // Ambient Screen Gradients (Apple Style - Luxury Minimal)
  lightGradient: ['#FCFBF9', '#F5F1EA', '#EFECE6'] as const,
  darkGradient: ['#0F0E0C', '#141210', '#171512'] as const,

  // Light Mode Tokens (Pearl Light Mode - Strict Design System)
  light: {
    background: '#FCFBF9',
    backgroundSecondary: '#F5F1EA',
    backgroundTertiary: '#EFECE6',
    card: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.74)' : '#FFFFFF',
    cardBorder: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.96)',
    controlSurface: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.88)' : '#FFFFFF',
    controlBorder: 'rgba(198, 151, 73, 0.30)',
    modalSurface: Platform.OS === 'web' ? 'rgba(255, 253, 250, 0.96)' : '#FFFDFA',
    input: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.88)' : '#FFFFFF',
    inputBorder: 'rgba(198, 151, 73, 0.30)',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#78716C',
    textSubtle: 'rgba(28, 25, 23, 0.45)',
    accent: '#9A6B26',
    accentBg: 'rgba(198, 151, 73, 0.14)',
    goldText: '#9A6B26',
    goldPillBg: 'rgba(198, 151, 73, 0.14)',
    emeraldText: '#047857',
    emeraldPillBg: 'rgba(16, 185, 129, 0.14)',
    amberText: '#B45309',
    amberPillBg: 'rgba(245, 158, 11, 0.14)',
    roseText: '#E11D48',
    rosePillBg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(198, 151, 73, 0.15)',
    shadow: 'rgba(28, 25, 23, 0.055)',
    freeSlotBorder: 'rgba(198, 151, 73, 0.45)',
  },

  // Dark Mode Tokens (Obsidian Charcoal Glass - Warm Espresso Undertone)
  dark: {
    background: '#101012',
    backgroundSecondary: '#141210',
    card: Platform.OS === 'web' ? 'rgba(26, 24, 21, 0.74)' : '#1A1815',
    cardBorder: 'rgba(229, 198, 135, 0.16)',
    controlSurface: Platform.OS === 'web' ? 'rgba(46, 42, 37, 0.88)' : '#2E2A25',
    controlBorder: 'rgba(229, 198, 135, 0.28)',
    modalSurface: Platform.OS === 'web' ? 'rgba(38, 35, 31, 0.96)' : '#26231F',
    input: Platform.OS === 'web' ? 'rgba(46, 42, 37, 0.88)' : '#2E2A25',
    inputBorder: 'rgba(229, 198, 135, 0.28)',
    text: '#F5F2EB',
    textSecondary: '#C7C1B8',
    textMuted: '#8F887D',
    textSubtle: 'rgba(245, 242, 235, 0.45)',
    accent: '#E5C687',
    accentBg: 'rgba(229, 198, 135, 0.14)',
    goldText: '#E5C687',
    goldPillBg: 'rgba(229, 198, 135, 0.14)',
    emeraldText: '#4ADE80',
    emeraldPillBg: 'rgba(74, 222, 128, 0.14)',
    amberText: '#FBBF24',
    amberPillBg: 'rgba(251, 191, 36, 0.14)',
    roseText: '#FB7185',
    rosePillBg: 'rgba(251, 113, 133, 0.15)',
    border: 'rgba(229, 198, 135, 0.14)',
    shadow: 'rgba(0, 0, 0, 0.62)',
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

