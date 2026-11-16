import { supabase } from '../lib/supabase';
import {
  HallPackageItem,
  HallSettingsPayload,
  PackagePayload,
} from '../types/settings';

/**
 * Service for managing hall configurations, operating slot hours, notification preferences,
 * and packages catalog via PostgreSQL live tables.
 */

export async function fetchHallSettings(hallId: string): Promise<HallSettingsPayload> {
  const { data, error } = await supabase
    .from('halls')
    .select(
      'name, phone, address, gst_number, bill_prefix, slot_mode, multi_day_enabled, morning_start, morning_end, evening_start, evening_end, notification_settings, event_types'
    )
    .eq('id', hallId)
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to fetch hall settings');
  }

  const defaultNotifications = {
    notify_owner_on_price_edit: true,
    notify_owner_on_cancel: true,
    notify_owner_on_reversal: true,
  };

  return {
    name: data.name || '',
    phone: data.phone || '',
    address: data.address || '',
    gstNumber: data.gst_number || '',
    billPrefix: data.bill_prefix || 'AURA-',
    slotMode: (data.slot_mode === 'full_day' ? 'full_day' : 'two_slots'),
    multiDayEnabled: Boolean(data.multi_day_enabled),
    morningStart: data.morning_start || '06:00:00',
    morningEnd: data.morning_end || '15:00:00',
    eveningStart: data.evening_start || '16:00:00',
    eveningEnd: data.evening_end || '23:59:59',
    notificationSettings: {
      ...defaultNotifications,
      ...(data.notification_settings || {}),
    },
    eventTypes: Array.isArray(data.event_types) && data.event_types.length > 0
      ? data.event_types
      : ['Wedding', 'Reception', 'Engagement', 'Birthday Party', 'Corporate Event'],
  };
}

export async function updateHallSettings(
  hallId: string,
  settings: HallSettingsPayload
): Promise<boolean> {
  const { error } = await supabase
    .from('halls')
    .update({
      name: settings.name.trim(),
      phone: settings.phone.trim(),
      address: settings.address?.trim() || null,
      gst_number: settings.gstNumber?.trim() || null,
      bill_prefix: settings.billPrefix.trim().toUpperCase(),
      slot_mode: settings.slotMode,
      multi_day_enabled: settings.multiDayEnabled,
      morning_start: settings.morningStart,
      morning_end: settings.morningEnd,
      evening_start: settings.eveningStart,
      evening_end: settings.eveningEnd,
      notification_settings: settings.notificationSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hallId);

  if (error) {
    throw new Error(error.message || 'Failed to update hall settings');
  }

  return true;
}

/**
 * Updates the custom event types for a hall. Enforces max 7 items constraint.
 */
export async function updateHallEventTypes(
  hallId: string,
  eventTypes: string[]
): Promise<string[]> {
  const cleanedTypes = eventTypes
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (cleanedTypes.length > 7) {
    throw new Error('Maximum 7 event types allowed per hall.');
  }

  const { data, error } = await supabase
    .from('halls')
    .update({
      event_types: cleanedTypes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hallId)
    .select('event_types')
    .single();

  if (error) {
    if (error.message?.includes('chk_max_7_event_types') || error.message?.includes('cardinality')) {
      throw new Error('Maximum 7 event types allowed per hall.');
    }
    throw new Error(error.message || 'Failed to update event types');
  }

  return data.event_types || [];
}

/**
 * Fetches the active event types for a hall.
 */
export async function getHallEventTypes(hallId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('halls')
    .select('event_types')
    .eq('id', hallId)
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to fetch event types');
  }

  return Array.isArray(data?.event_types) && data.event_types.length > 0
    ? data.event_types
    : ['Wedding', 'Reception', 'Engagement', 'Birthday Party', 'Corporate Event'];
}


export async function fetchHallPackages(hallId: string): Promise<HallPackageItem[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('id, hall_id, name, price, amenities, is_active, created_at')
    .eq('hall_id', hallId)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch hall packages');
  }

  return (data || []).map(p => ({
    ...p,
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
  }));
}

export async function createPackage(
  hallId: string,
  pkg: PackagePayload
): Promise<HallPackageItem> {
  const { data, error } = await supabase
    .from('packages')
    .insert({
      hall_id: hallId,
      name: pkg.name.trim(),
      price: Number(pkg.price),
      amenities: pkg.amenities,
      is_active: true,
    })
    .select('id, hall_id, name, price, amenities, is_active, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create package');
  }

  return {
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
  };
}

export async function updatePackage(
  packageId: string,
  pkg: PackagePayload
): Promise<HallPackageItem> {
  const { data, error } = await supabase
    .from('packages')
    .update({
      name: pkg.name.trim(),
      price: Number(pkg.price),
      amenities: pkg.amenities,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('id, hall_id, name, price, amenities, is_active, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update package');
  }

  return {
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
  };
}

export async function deletePackage(packageId: string): Promise<boolean> {
  // Soft-delete to preserve audit logs & existing booking relations
  const { error } = await supabase
    .from('packages')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId);

  if (error) {
    throw new Error(error.message || 'Failed to delete package');
  }

  return true;
}


