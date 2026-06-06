import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Proteins that require overnight thawing. Matches lowercased recipe.protein values.
// Spoonacular filter values: chicken, beef, pork, fish, shrimp, turkey, lamb, seafood.
// Imported recipes may also carry: duck. Excluded: tofu, vegetarian, vegan.
const THAWABLE = new Set([
  'beef', 'chicken', 'pork', 'turkey', 'lamb',
  'fish', 'seafood', 'shrimp', 'duck',
]);

const native = () => Capacitor.isNativePlatform();

// Does this meal entry need a thaw reminder?
// null → fall back to protein heuristic; 0 → explicitly off; 1 → explicitly on.
export function needsThaw(recipe, entry) {
  if (entry?.thawReminder === 1) return true;
  if (entry?.thawReminder === 0) return false;
  return THAWABLE.has((recipe?.protein || '').toLowerCase());
}

// Deterministic positive 31-bit integer from an entry id string.
// Deterministic so we can cancel even if notificationId was never persisted.
export function notifIdFor(entryId) {
  let h = 0;
  for (let i = 0; i < entryId.length; i++) h = (h * 31 + entryId.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2_147_483_646) + 1; // 1..2147483646, never 0
}

// Build the LOCAL fire datetime: `hour` o'clock the evening BEFORE isoDate.
// Constructs from date parts to avoid the UTC-parse timezone shift bug.
function fireTime(isoDate, hour) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d); // local midnight of the meal day
  dt.setDate(dt.getDate() - 1);     // night before
  dt.setHours(hour, 0, 0, 0);
  return dt;
}

// Request notification permission (Android 13+). Returns true if granted.
// Calling this multiple times is safe — OS shows the dialog only once.
export async function ensurePermission() {
  if (!native()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// Check current permission status without prompting.
export async function checkPermission() {
  if (!native()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// Schedule a thaw reminder for a meal entry. Returns the notification id (int)
// that was scheduled, or null if nothing was scheduled.
// Caller should persist the returned id to meal_entry.notificationId.
export async function scheduleForEntry(entry, recipe, { hour = 20 } = {}) {
  if (!native()) return null;
  if (!needsThaw(recipe, entry)) {
    await cancelForEntry(entry);
    return null;
  }

  const at = fireTime(entry.date, hour);
  if (at.getTime() <= Date.now()) return null; // don't schedule in the past

  // Request permission inline — OS shows the system dialog on first call and
  // remembers the grant. The Settings button handles re-grant if denied.
  const granted = await ensurePermission();
  if (!granted) return null;

  const id = notifIdFor(entry.id);
  const label = recipe?.protein
    ? recipe.protein.charAt(0).toUpperCase() + recipe.protein.slice(1)
    : (recipe?.name || 'meal');

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: 'Lay out the meat 🧊',
        body: `${label} for tomorrow's ${entry.slot} — move it to the fridge tonight.`,
        schedule: { at },
        sound: null,
        smallIcon: 'ic_stat_icon_config_sample',
      }],
    });
  } catch {
    return null;
  }

  return id;
}

// Cancel any pending notification for this entry.
export async function cancelForEntry(entry) {
  if (!native()) return;
  const id = entry?.notificationId ?? notifIdFor(entry.id);
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // Cancelling a non-existent notification is safe to swallow.
  }
}

// Cancel notifications for an array of entry ids (used when deleting a recipe's
// meals in bulk). Does not need the full entry object — derives id deterministically.
export async function cancelForEntryIds(entryIds) {
  if (!native() || !entryIds?.length) return;
  try {
    await LocalNotifications.cancel({
      notifications: entryIds.map(id => ({ id: notifIdFor(id) })),
    });
  } catch {}
}
