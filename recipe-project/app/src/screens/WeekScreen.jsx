import { useEffect, useState } from 'react';
import { currentWeek, ensureWeeks, daysOf, generateWeeks } from '../lib/weeks';
import { mealsForWeek, removeMeal, getRecipeById } from '../state/store';

// Meal-week planning surface (MVP2 + Calendar View Idea #1).
// Week selector + per-day lunch/dinner grid, fully editable.
export default function WeekScreen({ onOpen }) {
  const year = new Date().getUTCFullYear();
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [meals, setMeals] = useState([]);
  const [recipeNames, setRecipeNames] = useState({});

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
    const names = {};
    for (const e of m) {
      if (!names[e.recipeId]) {
        const r = await getRecipeById(e.recipeId);
        names[e.recipeId] = r?.name || '(missing recipe)';
      }
    }
    setRecipeNames(names);
  }

  if (!week) return <div className="screen"><p className="meta">Loading weeks…</p></div>;

  const days = daysOf(week);
  const mealAt = (date, slot) => meals.find((m) => m.date === date && m.slot === slot);

  return (
    <div className="screen">
      <h1 className="screen-title">Meal week</h1>

      <select className="input" value={week.id}
        onChange={(e) => setWeek(weeks.find((w) => w.id === e.target.value))}
        style={{ marginBottom: 14 }}>
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            Week {w.weekNumber} · {fmt(w.startDate)}–{fmt(w.endDate)}{w.isPartial ? ' (partial)' : ''}
          </option>
        ))}
      </select>

      {days.map((d, i) => (
        <div key={d} className="card fade-in" style={{ marginBottom: 'var(--gap-row)', animationDelay: `${i * 30}ms` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 8 }}>
            {new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          {['lunch', 'dinner'].map((slot) => {
            const m = mealAt(d, slot);
            return (
              <div key={slot} className="row-flex" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
                <span className="meta" style={{ width: 56, textTransform: 'capitalize' }}>{slot}</span>
                {m ? (
                  <div className="row-flex" style={{ flex: 1, justifyContent: 'space-between' }}>
                    <span onClick={() => onOpen(m.recipeId)} style={{ cursor: 'pointer', flex: 1 }}>
                      {recipeNames[m.recipeId]} <span className="muted">· {m.servings} serv</span>
                    </span>
                    <button onClick={() => removeMeal(m.id).then(() => loadMeals(week.id))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-hint)', fontSize: 16 }}>✕</button>
                  </div>
                ) : (
                  <span className="muted" style={{ flex: 1 }}>— add from Find</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function fmt(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
