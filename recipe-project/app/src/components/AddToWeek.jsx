import { useEffect, useState } from 'react';
import { currentWeek, daysOf } from '../lib/weeks';
import { addMeal } from '../state/store';

// Add-to-week modal (MVP1 -> MVP2). Defaults to the current week; meals are
// placed on a specific day + slot (lunch/dinner), servings max 4 / default 2.
export default function AddToWeek({ recipe, onClose }) {
  const [week, setWeek] = useState(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('dinner');
  const [servings, setServings] = useState(2);

  useEffect(() => {
    currentWeek().then((w) => {
      setWeek(w);
      if (w) setDate(daysOf(w)[0]);
    });
  }, []);

  if (!recipe) return null;
  const days = week ? daysOf(week) : [];

  async function save() {
    await addMeal({ weekId: week.id, date, slot, recipeId: recipe.id, servings });
    onClose(true);
  }

  return (
    <div onClick={() => onClose(false)} style={overlay}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>Add to week</h3>
        <p className="meta" style={{ marginTop: 0 }}>{recipe.name}</p>

        <label className="meta">Day</label>
        <select className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 10 }}>
          {days.map((d) => <option key={d} value={d}>{new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</option>)}
        </select>

        <label className="meta">Slot</label>
        <div style={{ display: 'flex', gap: 8, margin: '4px 0 10px' }}>
          {['lunch', 'dinner'].map((s) => (
            <button key={s} className={`chip ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)}>{s}</button>
          ))}
        </div>

        <label className="meta">Servings (max 4)</label>
        <div style={{ display: 'flex', gap: 8, margin: '4px 0 16px' }}>
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={`chip ${servings === n ? 'active' : ''}`} onClick={() => setServings(n)}>{n}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!week}>Add</button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(58,46,38,0.35)',
  display: 'grid', placeItems: 'center', zIndex: 50, padding: 16,
};
