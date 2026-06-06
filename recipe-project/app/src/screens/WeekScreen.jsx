import { useEffect, useState } from 'react';
import { currentWeek, ensureWeeks, daysOf, generateWeeks } from '../lib/weeks';
import { mealsForWeek, removeMeal, getRecipeById, updateMealThawReminder } from '../state/store';
import { needsThaw } from '../lib/thawReminders';
import { placeholderGradient } from '../lib/colorUtil';
import AddCustomMeal from '../components/AddCustomMeal';

// Multiple meals per slot are fully supported — the DB has no unique constraint on
// (weekId, date, slot), and addMeal just inserts. UI renders all entries per slot.
export default function WeekScreen({ onOpen }) {
  const year = new Date().getUTCFullYear();
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [meals, setMeals] = useState([]);
  const [recipeData, setRecipeData] = useState({}); // { [recipeId]: full recipe object }
  const [customMealTarget, setCustomMealTarget] = useState(null); // ISO date for the + button

  useEffect(() => {
    (async () => {
      await ensureWeeks(year);
      setWeeks(generateWeeks(year));
      setWeek(await currentWeek(year));
    })();
  }, [year]);

  useEffect(() => { if (week) loadMeals(week.id); }, [week]);

  async function loadMeals(weekId) {
    const m = await mealsForWeek(weekId);
    setMeals(m);
    const data = {};
    for (const e of m) {
      if (e.recipeId === '__custom__') continue;
      if (!data[e.recipeId]) {
        const r = await getRecipeById(e.recipeId);
        data[e.recipeId] = r || { name: '(missing recipe)', image: null };
      }
    }
    setRecipeData(data);
  }

  async function handleThawToggle(meal) {
    const recipe = recipeData[meal.recipeId] || null;
    const heuristic = needsThaw(recipe, { ...meal, thawReminder: null });
    let next;
    if (meal.thawReminder === null || meal.thawReminder === undefined) {
      // null: heuristic is source of truth. Override to the opposite.
      next = heuristic ? 0 : 1;
    } else {
      // Explicit override → clear back to heuristic.
      next = null;
    }
    // Optimistic UI update.
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, thawReminder: next } : m));
    await updateMealThawReminder(meal.id, next, recipe);
  }

  if (!week) return <div className="screen"><p className="meta">Loading weeks…</p></div>;

  const days = daysOf(week);
  const mealsAt = (date, slot) => meals.filter(m => m.date === date && m.slot === slot);

  return (
    <div className="screen">
      <h1 className="screen-title">Meal week</h1>

      <select className="input" value={week.id}
        onChange={e => setWeek(weeks.find(w => w.id === e.target.value))}
        style={{ marginBottom: 14, borderRadius: 8 }}>
        {weeks.map(w => (
          <option key={w.id} value={w.id}>
            Week {w.weekNumber} · {fmt(w.startDate)}–{fmt(w.endDate)}{w.isPartial ? ' (partial)' : ''}
          </option>
        ))}
      </select>

      {days.map((d, i) => (
        <div key={d} className="card fade-in" style={{ marginBottom: 'var(--gap-row)', animationDelay: `${i * 30}ms` }}>
          {/* Day header with + button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </span>
            <button
              onClick={() => setCustomMealTarget(d)}
              title="Add custom meal"
              style={{
                background: 'none', border: '1.5px solid var(--accent)', borderRadius: 6,
                width: 26, height: 26, cursor: 'pointer', color: 'var(--accent)',
                fontSize: 18, display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0,
              }}
            >+</button>
          </div>

          {['lunch', 'dinner'].map(slot => {
            const slotMeals = mealsAt(d, slot);
            return (
              <div key={slot} style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: 8, marginTop: 4 }}>
                <span className="meta" style={{ textTransform: 'capitalize', fontWeight: 600, display: 'block', marginBottom: 6 }}>{slot}</span>

                {slotMeals.length === 0 ? (
                  <span className="muted" style={{ fontSize: 13, paddingBottom: 6, display: 'block' }}>— add from Find</span>
                ) : (
                  slotMeals.map(m => {
                    const isCustom = m.recipeId === '__custom__';
                    const recipe = isCustom ? null : recipeData[m.recipeId];
                    if (!isCustom && !recipe) return null;
                    const displayName = isCustom ? (m.customTitle || 'Custom meal') : recipe.name;
                    const ingCount = isCustom && Array.isArray(m.customIngredients) ? m.customIngredients.length : 0;
                    const thawActive = !isCustom && needsThaw(recipe, m);

                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {/* Thumbnail chip */}
                        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          {recipe?.image ? (
                            <img src={recipe.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%',
                              background: isCustom ? 'var(--secondary-dark)' : placeholderGradient(displayName),
                              display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                            }}>
                              {displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <span
                          onClick={isCustom ? undefined : () => onOpen(m.recipeId)}
                          style={{ cursor: isCustom ? 'default' : 'pointer', flex: 1, fontSize: 14, fontWeight: 500 }}
                        >
                          {displayName}
                          {isCustom
                            ? ingCount > 0 && <span className="muted" style={{ fontWeight: 400 }}> · {ingCount} ingredient{ingCount !== 1 ? 's' : ''}</span>
                            : <span className="muted" style={{ fontWeight: 400 }}> · {m.servings} serv</span>
                          }
                        </span>

                        {/* Thaw reminder toggle — only for real recipes */}
                        {!isCustom && (
                          <button
                            onClick={() => handleThawToggle(m)}
                            title={thawActive ? 'Thaw reminder on — tap to turn off' : 'Thaw reminder off — tap to turn on'}
                            style={{
                              background: 'none', border: 'none', padding: '0 2px',
                              cursor: 'pointer', fontSize: 15, lineHeight: 1,
                              color: thawActive ? 'var(--accent)' : 'var(--text-hint)',
                              opacity: thawActive ? 1 : 0.5,
                            }}
                          >❄</button>
                        )}

                        <button onClick={() => removeMeal(m.id).then(() => loadMeals(week.id))}
                          style={{ background: 'none', border: 'none', color: 'var(--text-hint)', fontSize: 16, padding: '0 4px', cursor: 'pointer' }}>✕</button>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ))}

      {customMealTarget && (
        <AddCustomMeal
          defaultDate={customMealTarget}
          defaultWeek={week}
          onClose={(saved) => {
            setCustomMealTarget(null);
            if (saved) loadMeals(week.id);
          }}
        />
      )}
    </div>
  );
}

function fmt(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
