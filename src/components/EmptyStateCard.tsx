import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCheck,
  CalendarPlus,
  Clock,
  WifiOff,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { glassStyles } from '../theme/glass';

export type EmptyStateVariant = 'settled' | 'no-bookings' | 'timeline-empty' | 'error';

export interface EmptyStateCardProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  style,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  // Variant Configuration
  const getConfig = () => {
    switch (variant) {
      case 'settled':
        return {
          overline: 'AUDIT VERIFIED • 2026 CALENDAR',
          title: title || 'All Receivables Reconciled',
          description:
            description ||
            'Every client contract is settled. Zero overdue accounts or disputed balances across all active bookings.',
          actionLabel: actionLabel || 'View All Bookings →',
          icon: <CheckCheck size={20} color="#FFFFFF" strokeWidth={2.5} />,
          badgeColors: ['#10B981', '#059669'] as [string, string],
          ringBorder: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.35)',
          glowBg: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
          borderTint: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
          isPrimaryCta: false,
        };
      case 'no-bookings':
        return {
          overline: 'RESERVATION PIPELINE OPEN',
          title: title || 'No Dates Occupied for 2026',
          description:
            description ||
            'Your grand hall calendar is ready for prestigious reservations. Lock in your first booking to activate live financial analytics.',
          actionLabel: actionLabel || '+ Reserve Grand Event',
          icon: <CalendarPlus size={20} color="#FFFFFF" strokeWidth={2.2} />,
          badgeColors: colors.goldGradient as [string, string],
          ringBorder: isDark ? 'rgba(214, 174, 107, 0.4)' : 'rgba(198, 151, 73, 0.35)',
          glowBg: isDark ? 'rgba(214, 174, 107, 0.08)' : 'rgba(198, 151, 73, 0.06)',
          borderTint: isDark ? 'rgba(214, 174, 107, 0.3)' : 'rgba(198, 151, 73, 0.25)',
          isPrimaryCta: true,
        };
      case 'timeline-empty':
        return {
          overline: 'ACTIVITY CHRONICLE',
          title: title || 'Upcoming Functions on Schedule',
          description:
            description ||
            'Real-time execution logs, digital tax receipts, and payment settlements will cascade here once your upcoming events conclude.',
          actionLabel: actionLabel || 'Inspect Bookings Calendar →',
          icon: <Clock size={20} color="#FFFFFF" strokeWidth={2.2} />,
          badgeColors: isDark ? ['#334155', '#1E293B'] as [string, string] : ['#C69749', '#9E7432'] as [string, string],
          ringBorder: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(198, 151, 73, 0.3)',
          glowBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(198, 151, 73, 0.04)',
          borderTint: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(198, 151, 73, 0.18)',
          isPrimaryCta: false,
        };
      case 'error':
        return {
          overline: 'CONNECTION PAUSED',
          title: title || 'Unable to Synchronize',
          description:
            description ||
            'Could not retrieve live server data. Please check your network connection and retry.',
          actionLabel: actionLabel || '↻ Tap to Retry',
          icon: <WifiOff size={20} color="#FFFFFF" strokeWidth={2.2} />,
          badgeColors: ['#EF4444', '#DC2626'] as [string, string],
          ringBorder: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.3)',
          glowBg: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
          borderTint: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.25)',
          isPrimaryCta: false,
        };
    }
  };

  const config = getConfig();

  return (
    <View
      style={[
        styles.cardContainer,
        glassStyles.getCardStyle(isDark),
        {
          borderColor: config.borderTint,
          backgroundColor: isDark ? colors.dark.card : colors.light.card,
        },
        compact && styles.compactCard,
        style,
      ]}
    >
      {/* Background Ambient Glow */}
      <View
        pointerEvents="none"
        style={[styles.ambientGlow, { backgroundColor: config.glowBg }]}
      />

      {/* Concentric Dual-Ring Insignia */}
      <View style={[styles.outerRing, { borderColor: config.ringBorder }]}>
        <LinearGradient colors={config.badgeColors} style={styles.innerBadgeDisc}>
          {config.icon}
        </LinearGradient>
      </View>

      {/* Typography Hierarchy */}
      <Text
        style={[
          styles.overline,
          { color: isDark ? colors.gold[400] : colors.gold[700] },
        ]}
      >
        {config.overline}
      </Text>

      <Text style={[styles.title, { color: t.text }]}>{config.title}</Text>

      <Text style={[styles.description, { color: t.textMuted }]}>
        {config.description}
      </Text>

      {/* CTA Button */}
      {config.actionLabel && onAction && (
        <View style={styles.actionContainer}>
          {config.isPrimaryCta ? (
            <TouchableOpacity
              onPress={onAction}
              activeOpacity={0.85}
              style={styles.primaryBtnWrapper}
            >
              <LinearGradient
                colors={colors.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{config.actionLabel}</Text>
                <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onAction}
              activeOpacity={0.8}
              style={[
                styles.ghostBtn,
                {
                  borderColor: isDark ? colors.gold[500] : colors.gold[600],
                  backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.ghostBtnText,
                  { color: isDark ? colors.gold[400] : colors.gold[700] },
                ]}
              >
                {config.actionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  compactCard: {
    width: 250,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  ambientGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 36,
  },
  outerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  innerBadgeDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: 2,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnWrapper: {
    borderRadius: 9999,
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    minHeight: 44,
    gap: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ghostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

