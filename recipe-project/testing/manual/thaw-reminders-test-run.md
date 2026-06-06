# Device test run — Thaw Reminders (Idea #2)

- **Build/commit:** <git short sha>
- **Device:** <tablet model, Android version>
- **Tester:** Manning
- **App load mode:** installed APK (`npm run android:run`)

## Pre-conditions

- Fresh build deployed with `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; npm run android:run`
- At least one chicken/beef recipe already imported or cached from Spoonacular
- At least one vegetarian/vegan recipe available
- Device clock set correctly (local timezone)

## Test cases

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 1 | Heuristic fires for meat | Add a chicken recipe to **tomorrow**. Open Settings → Reminders → tap "Grant notification permission". Wait for 20:00 tonight. | Permission dialog shown (first run). Notification fires at 20:00 with title "Lay out the meat 🧊" and body mentioning chicken. | | |
| 2 | Heuristic suppressed for veg | Add a vegetarian recipe to tomorrow. | No notification scheduled. `LocalNotifications.getPending()` does not list this meal's id. | | |
| 3 | Manual override — veg meal on | On the vegetarian meal from #2, tap the ❄ icon in WeekScreen. It should turn terracotta (active). | Notification scheduled. Pending list includes the id. | | |
| 4 | Manual override — meat meal off | On the chicken meal from #1, tap ❄ (turns grey). | Notification cancelled. Pending list no longer includes the id. | | |
| 5 | Toggle back to heuristic | On the chicken meal from #4 (explicitly off), tap ❄ again. | thawReminder resets to null (heuristic), chicken → reminder re-scheduled. | | |
| 6 | Delete meal cancels notification | Add a chicken meal for tomorrow. Verify notification is pending. Delete the meal via ✕. | Notification gone from pending list. | | |
| 7 | Delete recipe cancels all meals' notifications | Add a chicken recipe to two different days. Verify two notifications pending. Delete the recipe from the Finder. | Both notifications gone from pending list. | | |
| 8 | Past-fire date — no schedule | Add a meal dated **yesterday** or today with tonight's time already past. | No notification scheduled (no crash). | | |
| 9 | Change reminder time | In Settings → Reminders, change time to 18:00. Add a new chicken meal for tomorrow. | New notification fires at 18:00 (not 20:00). Already-scheduled meals fire at their original time (bulk reschedule is a v2 gap — note in run). | | |
| 10 | Web build — no crash | Run `npm run dev`. Add a chicken meal. Open console. | No errors, no crashes. All plugin calls silently no-op. | | |
| 11 | Timezone sanity (Eastern) | With device in Eastern time, add a meal for 2026-06-07. | Notification schedules for the evening of June 6 local — NOT June 5. | | |
| 12 | Master toggle off | In Settings → Reminders, flip master toggle off. Add a chicken meal. | No notification scheduled regardless of protein. *(Note: toggle persists to Preferences. Newly added meals skip scheduling when `reminders_on = false`.)* | | |

## Verify pending notifications (developer tool)

In Chrome DevTools remote tab for the app WebView, run:

```js
// This only works on native. On web it will throw.
const { Capacitor } = window;
// Use the JS bridge directly:
// Check @capacitor/local-notifications pending list via the capacitor plugin.
```

Or add a temporary debug button in SettingsScreen:

```jsx
<button onClick={async () => {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  alert(JSON.stringify(pending.notifications.map(n => ({ id: n.id, at: n.schedule?.at }))));
}}>Debug: show pending</button>
```

## Failures filed

_(none yet)_

## Notes

- v1 gaps (documented, do not file as bugs):
  - Changing reminder time does not bulk-reschedule existing pending notifications.
  - Lunch meals fire the night before like dinner (morning-of is a v2 refinement).
  - Multi-day thaw for large cuts (whole turkey etc.) not implemented.
  - Device powered off at fire time: OS may deliver late or drop — acceptable.
