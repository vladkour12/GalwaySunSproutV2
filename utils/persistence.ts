/**
 * Centralized persistence utilities for app-wide user preferences and settings
 */

const STORAGE_KEYS = {
  PROFIT_CALC: 'galway_profit_calc_settings',
  DISMISSED_ALERTS: 'galway_dismissed_alerts',
  FINANCE_PREFS: 'galway_finance_preferences',
  CROP_MANAGER_PREFS: 'galway_crop_manager_prefs',
  ORDERS: 'galway_orders',
} as const;

/**
 * Generic localStorage helpers with error handling
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save to localStorage (${key}):`, e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`Failed to load from localStorage (${key}):`, e);
  }
  return defaultValue;
}

export function clearStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Failed to clear localStorage (${key}):`, e);
  }
}

/**
 * Finance Tracker preferences
 */
export interface FinancePreferences {
  viewMode: 'transactions' | 'customers';
  timeRange: 'month' | 'last_month' | 'year' | 'all';
}

export function saveFinancePreferences(prefs: FinancePreferences): void {
  saveToStorage(STORAGE_KEYS.FINANCE_PREFS, prefs);
}

export function loadFinancePreferences(): FinancePreferences {
  return loadFromStorage<FinancePreferences>(STORAGE_KEYS.FINANCE_PREFS, {
    viewMode: 'transactions',
    timeRange: 'month',
  });
}

/**
 * Crop Manager preferences
 */
export interface CropManagerPreferences {
  activeTab: 'production' | 'varieties' | 'plan' | 'calendar';
  plannerMode: 'event' | 'recurring';
}

export function saveCropManagerPreferences(prefs: CropManagerPreferences): void {
  saveToStorage('galway_crop_manager_prefs', prefs);
}

export function loadCropManagerPreferences(): CropManagerPreferences {
  return loadFromStorage<CropManagerPreferences>('galway_crop_manager_prefs', {
    activeTab: 'production',
    plannerMode: 'event',
  });
}

/**
 * Re-export storage keys for other modules
 */
export { STORAGE_KEYS };
