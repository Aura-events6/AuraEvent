import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Pressable,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package as PackageIcon,
  Plus,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  X,
  AlertCircle,
  Tag,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { glassStyles } from '../theme/glass';
import { useBackOverlay } from '../hooks/useBackOverlay';
import { PrimaryButton } from '../components';
import { RollingNumberTicker } from '../components/dashboard/RollingNumberTicker';
import { motionTokens } from '../theme/motion';
import {
  fetchHallPackages,
  createPackage,
  updatePackage,
  deletePackage,
} from '../services/hallSettingsService';
import { HallPackageItem } from '../types/settings';
import { ScreenBackground } from '../components/common';

const SUGGESTED_AMENITIES = [
  'Main Hall AC',
  'Standard Lighting',
  'Sound & Mic Setup',
  'Chairs & Banquet Tables',
  'Generator Backup',
  'Stage Floral Decor',
  'Bridal Suite AC',
  'Valet Parking',
  'Kitchen & Dining Access',
];

export const PackagesScreen: React.FC = () => {
  const { user, hall, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  const hallId = hall?.id || (user && 'hallId' in user ? user.hallId : undefined);

  const [packages, setPackages] = useState<HallPackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State & Multi-state CTA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<HallPackageItem | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(isModalOpen, () => {
    handleCloseModal();
  });

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Spring sheet entrance when modal opens
  useEffect(() => {
    if (isModalOpen) {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
      setSubmitState('idle');
    }
  }, [isModalOpen]);

  const handleCloseModal = () => {
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setIsModalOpen(false);
      setErrorMsg(null);
    });
  };

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const loadPackages = useCallback(async () => {
    if (!hallId) {
      setIsLoading(false);
      return;
    }

    try {
      setErrorMsg(null);
      const data = await fetchHallPackages(hallId);
      setPackages(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load packages catalog');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hallId]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPackages();
  };

  const openAddModal = () => {
    setEditingPkg(null);
    setName('');
    setPrice('');
    setAmenities(['Main Hall AC', 'Standard Lighting', 'Chairs & Banquet Tables']);
    setCustomAmenityInput('');
    setErrorMsg(null);
    setSubmitState('idle');
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: HallPackageItem) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setPrice(String(pkg.price));
    setAmenities([...pkg.amenities]);
    setCustomAmenityInput('');
    setErrorMsg(null);
    setSubmitState('idle');
    setIsModalOpen(true);
  };

  const addAmenity = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (!amenities.includes(trimmed)) {
      setAmenities([...amenities, trimmed]);
    }
    setCustomAmenityInput('');
  };

  const removeAmenity = (item: string) => {
    setAmenities(amenities.filter((a) => a !== item));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Package name is required.');
      triggerErrorShake();
      return;
    }
    const numPrice = Number(price.replace(/[^\d.]/g, ''));
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Please enter a valid package price greater than zero.');
      triggerErrorShake();
      return;
    }
    if (!hallId) return;

    try {
      setIsSubmitting(true);
      setSubmitState('saving');
      setErrorMsg(null);

      if (editingPkg) {
        await updatePackage(editingPkg.id, {
          name: name.trim(),
          price: numPrice,
          amenities,
        });
      } else {
        await createPackage(hallId, {
          name: name.trim(),
          price: numPrice,
          amenities,
        });
      }

      setSubmitState('saved');
      setTimeout(async () => {
        handleCloseModal();
        await loadPackages();
        setSubmitState('idle');
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save package');
      triggerErrorShake();
      setSubmitState('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (pkg: HallPackageItem) => {
    const confirmDelete = () => {
      const g = globalThis as any;
      if (Platform.OS === 'web' && g && g.confirm) {
        const confirmed = g.confirm(
          `Are you sure you want to delete the package "${pkg.name}"? It will be soft-deleted so previous bookings remain intact.`
        );
        if (confirmed) executeDelete(pkg.id);
      } else {
        Alert.alert(
          'Delete Package',
          `Are you sure you want to delete "${pkg.name}"? Historical bookings referencing this package will be preserved.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => executeDelete(pkg.id),
            },
          ]
        );
      }
    };

    confirmDelete();
  };

  const executeDelete = async (packageId: string) => {
    try {
      await deletePackage(packageId);
      await loadPackages();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete package');
    }
  };

  // Strict Role & Permission Enforcement
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const canAccessPackages = isOwner || Boolean((user as any)?.screenAccess?.search);

  if (!canAccessPackages) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? colors.dark.background : colors.light.background },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.accessRestrictedWrap}>
          <View
            style={[
              styles.restrictedIconBox,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
            ]}
          >
            <ShieldAlert
              size={44}
              color={isDark ? colors.status.danger.dark : colors.status.danger.light}
            />
          </View>
          <Text style={[styles.restrictedTitle, { color: t.text }]}>
            Packages Access Restricted
          </Text>
          <Text style={[styles.restrictedSubtitle, { color: t.textMuted }]}>
            Your staff account does not have permission to view or manage hall pricing packages. Please contact the Hall Owner.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
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
          <View style={styles.brandRow}>
            <LinearGradient colors={colors.goldGradient} style={styles.headerEmblem}>
              <PackageIcon size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: t.text }]}>Packages</Text>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {hall?.name || user?.hallName || 'Hall Packages & Pricing'}
              </Text>
            </View>
          </View>
        </View>
      </View>

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
        {/* TOOLBAR */}
        <View style={styles.toolbarRow}>
          <View style={styles.countGroup}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Active Packages</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {packages.length}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openAddModal}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.965 : 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add Package"
          >
            <LinearGradient colors={colors.goldGradient} style={styles.addBtn}>
              <Plus size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Package</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ERROR BANNER */}
        {errorMsg && !isModalOpen && (
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
            <AlertCircle
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
              {errorMsg}
            </Text>
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
              Loading packages catalog...
            </Text>
          </View>
        ) : packages.length === 0 ? (
          <View style={[styles.emptyBox, glassStyles.getCardStyle(isDark)]}>
            <PackageIcon size={36} color={t.textSubtle} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>
              No Packages Configured
            </Text>
            <Text style={[styles.emptySubtitle, { color: t.textMuted }]}>
              Create packages with standard pricing and included amenities to streamline booking quotes.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {packages.map((pkg) => (
              <View
                key={pkg.id}
                style={[styles.packageCard, glassStyles.getCardStyle(isDark)]}
              >
                <View style={styles.pkgTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleWithTag}>
                      <Text style={[styles.pkgName, { color: t.text }]}>
                        {pkg.name}
                      </Text>
                    </View>
                    <RollingNumberTicker
                      targetValue={Number(pkg.price)}
                      isCurrency
                      prefix="₹"
                      duration={480}
                      style={[
                        styles.pkgPrice,
                        { color: isDark ? colors.gold[400] : colors.gold[600] },
                      ]}
                    />
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => openEditModal(pkg)}
                      style={({ pressed }) => [
                        styles.actionIconBtn,
                        {
                          backgroundColor: pressed
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.20)'
                              : 'rgba(198, 151, 73, 0.15)'
                            : 'transparent',
                          transform: [{ scale: pressed ? 0.88 : 1 }],
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${pkg.name}`}
                    >
                      <Edit2 size={16} color={t.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(pkg)}
                      style={({ pressed }) => [
                        styles.actionIconBtn,
                        {
                          backgroundColor: pressed
                            ? isDark
                              ? 'rgba(239, 68, 68, 0.20)'
                              : 'rgba(239, 68, 68, 0.15)'
                            : 'transparent',
                          transform: [{ scale: pressed ? 0.88 : 1 }],
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${pkg.name}`}
                    >
                      <Trash2
                        size={16}
                        color={
                          isDark
                            ? colors.status.danger.dark
                            : colors.status.danger.light
                        }
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Amenity Chips */}
                <View style={styles.amenitiesContainer}>
                  {pkg.amenities && pkg.amenities.length > 0 ? (
                    pkg.amenities.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.amenityChip,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.08)',
                          },
                        ]}
                      >
                        <Check
                          size={11}
                          color={isDark ? colors.gold[400] : colors.gold[600]}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.amenityText, { color: t.text }]}>
                          {item}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noAmenitiesText, { color: t.textSubtle }]}>
                      Standard hall access
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ADD / EDIT PACKAGE MODAL WITH SPRING SHEET & MULTI-STATE CTA */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#18171B' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [36, 0],
                    }),
                  },
                  {
                    scale: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Sparkles size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text style={[styles.modalTitle, { color: t.text }]}>
                  {editingPkg ? 'Edit Package' : 'Create New Package'}
                </Text>
              </View>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Inline Error Alert Banner with Horizontal Error Shake */}
              {errorMsg && (
                <Animated.View
                  style={[
                    styles.modalErrorBanner,
                    {
                      backgroundColor: isDark
                        ? colors.status.danger.bgDark
                        : colors.status.danger.bgLight,
                      transform: [{ translateX: shakeAnim }],
                    },
                  ]}
                >
                  <AlertCircle
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
                    {errorMsg}
                  </Text>
                </Animated.View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: t.text }]}>Package Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. Diamond Royal Package"
                  placeholderTextColor={t.textSubtle}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: t.text }]}>Price (₹) *</Text>
                <TextInput
                  value={price}
                  onChangeText={(val) => {
                    setPrice(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. 250000"
                  keyboardType="numeric"
                  placeholderTextColor={t.textSubtle}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  editable={!isSubmitting}
                />
              </View>

              {/* AMENITIES MANAGEMENT */}
              <View style={styles.amenitiesGroup}>
                <Text style={[styles.inputLabel, { color: t.text }]}>
                  Included Amenities ({amenities.length})
                </Text>

                {/* Current Amenities Chips */}
                <View style={styles.activeChipsWrap}>
                  {amenities.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.activeChip,
                        {
                          backgroundColor: isDark
                            ? colors.dark.accentBg
                            : colors.light.accentBg,
                          borderColor: isDark
                            ? 'rgba(214, 174, 107, 0.3)'
                            : 'rgba(198, 151, 73, 0.35)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeChipText,
                          { color: isDark ? colors.gold[400] : colors.gold[600] },
                        ]}
                      >
                        {item}
                      </Text>
                      <Pressable
                        onPress={() => removeAmenity(item)}
                        style={({ pressed }) => [
                          styles.chipRemoveBtn,
                          { transform: [{ scale: pressed ? 0.85 : 1 }] },
                        ]}
                        accessibilityLabel={`Remove ${item}`}
                      >
                        <X
                          size={12}
                          color={isDark ? colors.gold[400] : colors.gold[600]}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Add Custom Amenity Input */}
                <View style={styles.customAddRow}>
                  <TextInput
                    value={customAmenityInput}
                    onChangeText={setCustomAmenityInput}
                    placeholder="Type custom amenity & tap Add"
                    placeholderTextColor={t.textSubtle}
                    style={[
                      styles.modalInput,
                      styles.customAddInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        color: t.text,
                      },
                    ]}
                    onSubmitEditing={() => addAmenity(customAmenityInput)}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.customAddBtn,
                      {
                        backgroundColor: isDark
                          ? colors.gold[500]
                          : colors.gold[600],
                        transform: [{ scale: pressed ? 0.92 : 1 }],
                      },
                    ]}
                    onPress={() => addAmenity(customAmenityInput)}
                    accessibilityRole="button"
                    accessibilityLabel="Add custom amenity"
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Suggested Quick-Add Amenities */}
                <Text style={[styles.suggestedLabel, { color: t.textSubtle }]}>
                  Suggested Amenities:
                </Text>
                <View style={styles.suggestedChipsWrap}>
                  {SUGGESTED_AMENITIES.filter((a) => !amenities.includes(a)).map(
                    (suggested) => (
                      <Pressable
                        key={suggested}
                        style={({ pressed }) => [
                          styles.suggestedChip,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(28, 25, 23, 0.05)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(198, 151, 73, 0.15)',
                            transform: [{ scale: pressed ? 0.94 : 1 }],
                          },
                        ]}
                        onPress={() => addAmenity(suggested)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${suggested}`}
                      >
                        <Plus size={10} color={t.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.suggestedChipText, { color: t.textMuted }]}>
                          {suggested}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>

              {/* Multi-State CTA Button Morph */}
              <View style={styles.modalSubmitWrap}>
                <Pressable
                  onPress={handleSave}
                  disabled={submitState !== 'idle'}
                  style={({ pressed }) => [
                    styles.primaryCtaBtn,
                    {
                      backgroundColor:
                        submitState === 'saved'
                          ? '#059669'
                          : isDark
                          ? colors.gold[500]
                          : colors.gold[600],
                      transform: [{ scale: pressed && submitState === 'idle' ? 0.965 : 1 }],
                      opacity: submitState === 'saving' ? 0.88 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={editingPkg ? 'Update Package' : 'Save Package'}
                >
                  {submitState === 'saving' ? (
                    <View style={styles.ctaLoadingRow}>
                      <ActivityIndicator size="small" color="#000000" />
                      <Text style={styles.primaryCtaText}>
                        {editingPkg ? 'Updating Package...' : 'Saving Package...'}
                      </Text>
                    </View>
                  ) : submitState === 'saved' ? (
                    <View style={styles.ctaLoadingRow}>
                      <Check size={18} color="#FFFFFF" strokeWidth={3} />
                      <Text style={[styles.primaryCtaText, { color: '#FFFFFF' }]}>
                        {editingPkg ? 'Package Updated ✓' : 'Package Saved ✓'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.ctaLoadingRow}>
                      <Sparkles size={16} color="#000000" />
                      <Text style={styles.primaryCtaText}>
                        {editingPkg ? 'Update Package' : 'Save Package'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  </ScreenBackground>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmblem: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollContent: {
    paddingBottom: 110,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  countGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minHeight: 38,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardsList: {
    gap: 14,
  },
  packageCard: {
    padding: 16,
    borderRadius: 20,
  },
  pkgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleWithTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pkgName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pkgPrice: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noAmenitiesText: {
    fontSize: 12,
    fontStyle: 'italic',
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
  emptyBox: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  amenitiesGroup: {
    marginBottom: 20,
  },
  activeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipRemoveBtn: {
    padding: 2,
  },
  customAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  customAddInput: {
    flex: 1,
  },
  customAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  suggestedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestedChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalSubmitWrap: {
    marginTop: 8,
    marginBottom: 8,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  primaryCtaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCtaText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessRestrictedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 420,
    alignSelf: 'center',
  },
  restrictedIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
});
