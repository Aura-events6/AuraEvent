import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  UserPlus,
  ShieldAlert,
  Users as UsersIcon,
  Crown,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTeamMembers,
  deactivateStaffMember,
  reactivateStaffMember,
  deleteStaffMember,
} from '../../services/staffService';
import { TeamMemberItem } from '../../types/staff';
import {
  TeamLimitCounter,
  StaffCard,
  AddStaffModal,
  EditPermissionsModal,
  ResetPasswordModal,
  StaffCredentialsSuccessModal,
} from '../../components/staff';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';

export const UsersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, hall, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Verify owner role
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';

  // Team state
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [canAddMore, setCanAddMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<TeamMemberItem | null>(null);
  const [selectedMemberForReset, setSelectedMemberForReset] = useState<TeamMemberItem | null>(null);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    staffName: string;
    username: string;
    password?: string;
  } | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const hallId = hall?.id || (user && 'hallId' in user ? user.hallId : undefined);

  const loadTeamData = useCallback(async () => {
    if (!hallId) {
      setIsLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      const data = await fetchTeamMembers(hallId);
      setMembers(data.members);
      setActiveCount(data.activeCount);
      setCanAddMore(data.canAddMore);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load team directory');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hallId]);

  useEffect(() => {
    if (isOwner) {
      loadTeamData();
    } else {
      setIsLoading(false);
    }
  }, [isOwner, loadTeamData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTeamData();
  };

  const handleDeactivateStaff = (member: TeamMemberItem) => {
    const confirmPrompt = () => {
      const g = globalThis as any;
      if (Platform.OS === 'web' && g && g.confirm) {
        const confirmed = g.confirm(
          `Deactivate @${member.username}? This will revoke their app login and free up 1 team seat. You can reactivate or permanently delete this account later.`
        );
        if (confirmed) executeDeactivateStaff(member.id);
      } else {
        Alert.alert(
          'Deactivate Staff Member',
          `Deactivate @${member.username}? This will revoke their app login and free up 1 team seat. You can reactivate or permanently delete this account later.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Deactivate',
              style: 'destructive',
              onPress: () => executeDeactivateStaff(member.id),
            },
          ]
        );
      }
    };

    confirmPrompt();
  };

  const executeDeactivateStaff = async (memberId: string) => {
    try {
      setDeactivatingId(memberId);
      await deactivateStaffMember(memberId);
      await loadTeamData();
      Alert.alert('Deactivated', 'Staff member has been deactivated and 1 team seat is freed.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to deactivate member');
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleReactivateStaff = async (member: TeamMemberItem) => {
    if (!canAddMore) {
      Alert.alert(
        'Team Limit Reached',
        `Cannot reactivate @${member.username}. You already have 5 active team members. Please deactivate another member or upgrade your plan first.`
      );
      return;
    }

    try {
      setDeactivatingId(member.id);
      await reactivateStaffMember(member.id);
      await loadTeamData();
      Alert.alert('Reactivated', `@${member.username} is now active and can log in.`);
    } catch (err: any) {
      Alert.alert('Reactivation Failed', err.message || 'Failed to reactivate staff member');
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleDeleteStaff = (member: TeamMemberItem) => {
    const confirmPrompt = () => {
      const g = globalThis as any;
      if (Platform.OS === 'web' && g && g.confirm) {
        const confirmed = g.confirm(
          `Permanently delete @${member.username}? This cannot be undone and will permanently remove their credentials and directory record.`
        );
        if (confirmed) executeDeleteStaff(member.id);
      } else {
        Alert.alert(
          'Delete Staff Member',
          `Permanently delete @${member.username}? This cannot be undone and will permanently remove their credentials and directory record.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete Permanently',
              style: 'destructive',
              onPress: () => executeDeleteStaff(member.id),
            },
          ]
        );
      }
    };

    confirmPrompt();
  };

  const executeDeleteStaff = async (memberId: string) => {
    try {
      setDeactivatingId(memberId);
      await deleteStaffMember(memberId);
      await loadTeamData();
      Alert.alert('Deleted', 'Staff account deleted permanently.');
    } catch (err: any) {
      Alert.alert('Delete Failed', err.message || 'Failed to delete staff member');
    } finally {
      setDeactivatingId(null);
    }
  };

  // If not owner, display security restricted view
  if (!isOwner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.restrictedContainer}>
          <View
            style={[
              styles.restrictedCard,
              glassStyles.getCardStyle(isDark),
              {
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(239, 68, 68, 0.35)',
              },
            ]}
          >
            <View
              style={[
                styles.restrictedIconBox,
                {
                  backgroundColor: isDark
                    ? colors.status.danger.bgDark
                    : colors.status.danger.bgLight,
                },
              ]}
            >
              <ShieldAlert
                size={32}
                color={isDark ? colors.status.danger.dark : colors.status.danger.light}
              />
            </View>

            <Text style={[styles.restrictedTitle, { color: t.text }]}>
              Access Restricted
            </Text>
            <Text style={[styles.restrictedMessage, { color: t.textMuted }]}>
              Only the hall owner can manage team members, invite staff, and configure
              screen permissions.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.backHomeBtn,
                {
                  backgroundColor: isDark
                    ? colors.dark.accentBg
                    : colors.light.accentBg,
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.3)'
                    : 'rgba(198, 151, 73, 0.4)',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft
                size={16}
                color={isDark ? colors.gold[400] : colors.gold[600]}
              />
              <Text
                style={[
                  styles.backHomeBtnText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* TOP HEADER */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Platform.OS === 'android' ? 26 : 10,
            paddingHorizontal: isMobile ? 16 : 24,
          },
        ]}
      >
        <View style={[styles.headerContainer, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backBtn,
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color={t.text} />
            </Pressable>

            <View style={styles.titleGroup}>
              <View style={styles.titleRow}>
                <Text style={[styles.headerTitle, { color: t.text }]}>
                  Team Management
                </Text>
                <Crown size={15} color={colors.gold[400]} />
              </View>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {hall?.name || user?.hallName || 'Staff Accounts & Access'}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addStaffHeaderBtn,
              {
                backgroundColor: canAddMore
                  ? isDark
                    ? colors.gold[500]
                    : colors.gold[600]
                  : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(28, 25, 23, 0.1)',
                opacity: canAddMore ? 1 : 0.6,
                transform: [{ scale: pressed && canAddMore ? 0.965 : 1 }],
              },
            ]}
            onPress={() => {
              if (!canAddMore) {
                Alert.alert(
                  'Team Limit Reached',
                  'Your hall has reached the maximum of 5 active team members. Please remove or deactivate an existing member first.'
                );
                return;
              }
              setIsAddModalOpen(true);
            }}
            accessibilityLabel="Add new staff member"
          >
            <UserPlus size={16} color="#FFFFFF" />
            <Text style={styles.addStaffHeaderBtnText}>Add Staff</Text>
          </Pressable>
        </View>
      </View>

      {/* MAIN BODY */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isMobile ? 16 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.gold[400] : colors.gold[600]}
          />
        }
      >
        {/* TEAM LIMIT PROGRESS COUNTER */}
        <TeamLimitCounter
          activeCount={activeCount}
          maxLimit={5}
          isDark={isDark}
        />

        {/* ERROR NOTICE */}
        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: isDark
                  ? colors.status.danger.bgDark
                  : colors.status.danger.bgLight,
              },
            ]}
          >
            <ShieldAlert
              size={16}
              color={isDark ? colors.status.danger.dark : colors.status.danger.light}
            />
            <Text
              style={[
                styles.errorText,
                {
                  color: isDark
                    ? colors.status.danger.dark
                    : colors.status.danger.light,
                },
              ]}
            >
              {errorMessage}
            </Text>
            <Pressable
              onPress={loadTeamData}
              style={({ pressed }) => [
                styles.retryBtn,
                { transform: [{ scale: pressed ? 0.90 : 1 }] },
              ]}
            >
              <RefreshCw
                size={14}
                color={isDark ? colors.status.danger.dark : colors.status.danger.light}
              />
            </Pressable>
          </View>
        )}

        {/* LOADING INDICATOR */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={isDark ? colors.gold[400] : colors.gold[600]}
            />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Loading team directory...
            </Text>
          </View>
        ) : (
          <View style={styles.membersSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: t.text }]}>
                Team Directory
              </Text>
              <Text style={[styles.memberCountBadge, { color: t.textSubtle }]}>
                {members.length} {members.length === 1 ? 'member' : 'members'} total
              </Text>
            </View>

            {members.length === 0 ? (
              <View style={[styles.emptyBox, glassStyles.getCardStyle(isDark)]}>
                <UsersIcon size={32} color={t.textSubtle} />
                <Text style={[styles.emptyTitle, { color: t.text }]}>
                  No Team Members Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: t.textMuted }]}>
                  Add staff members to delegate calendar viewing, booking, and Khatabook access.
                </Text>
              </View>
            ) : (
              members.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  onEditPermissions={(m) => setSelectedMemberForPerms(m)}
                  onResetPassword={(m) => setSelectedMemberForReset(m)}
                  onDeactivate={handleDeactivateStaff}
                  onReactivate={handleReactivateStaff}
                  onDelete={handleDeleteStaff}
                  isDark={isDark}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      <AddStaffModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(created) => {
          loadTeamData();
          if (created) {
            setCreatedStaffCredentials(created);
          }
        }}
        canAddMore={canAddMore}
        existingUsernames={members.map((m) => m.username.toLowerCase())}
        isDark={isDark}
      />

      <StaffCredentialsSuccessModal
        visible={Boolean(createdStaffCredentials)}
        onClose={() => setCreatedStaffCredentials(null)}
        staffName={createdStaffCredentials?.staffName || ''}
        username={createdStaffCredentials?.username || ''}
        password={createdStaffCredentials?.password}
        hallPhone={hall?.phone || ''}
        isDark={isDark}
      />

      <EditPermissionsModal
        visible={Boolean(selectedMemberForPerms)}
        member={selectedMemberForPerms}
        onClose={() => setSelectedMemberForPerms(null)}
        onSuccess={() => {
          loadTeamData();
        }}
        isDark={isDark}
      />

      <ResetPasswordModal
        visible={Boolean(selectedMemberForReset)}
        member={selectedMemberForReset}
        onClose={() => setSelectedMemberForReset(null)}
        onSuccess={() => {
          setSelectedMemberForReset(null);
        }}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleGroup: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  addStaffHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 38,
  },
  addStaffHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 60,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryBtn: {
    padding: 4,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  membersSection: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  memberCountBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  restrictedCard: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  restrictedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  restrictedMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  backHomeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

