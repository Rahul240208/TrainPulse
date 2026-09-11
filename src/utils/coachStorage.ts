/**
 * Cross-platform persistence for user's selected coach per train.
 * Compatible with Web (localStorage) and React Native / Expo Go (in-memory session map).
 * Requires zero external dependencies and zero logins.
 */

const memoryStorage = new Map<string, string>();

const STORAGE_PREFIX = 'trainpulse_my_coach_';

function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null
    );
  } catch {
    return false;
  }
}

/**
 * Retrieves the user's saved coach for a train number.
 */
export function getSavedCoach(trainNumber: string): string | null {
  if (!trainNumber) return null;
  const key = `${STORAGE_PREFIX}${trainNumber}`;

  if (isLocalStorageAvailable()) {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) return saved.trim();
    } catch {
      // Fallback to in-memory map
    }
  }

  return memoryStorage.get(key) || null;
}

/**
 * Saves the user's chosen coach for a train number.
 */
export function saveCoach(trainNumber: string, coachNumber: string): void {
  if (!trainNumber || !coachNumber) return;
  const key = `${STORAGE_PREFIX}${trainNumber}`;
  const value = coachNumber.trim();

  memoryStorage.set(key, value);

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Local storage quota or security restriction fallback
    }
  }
}

/**
 * Clears the user's chosen coach for a train number.
 */
export function clearSavedCoach(trainNumber: string): void {
  if (!trainNumber) return;
  const key = `${STORAGE_PREFIX}${trainNumber}`;

  memoryStorage.delete(key);

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Local storage fallback
    }
  }
}
