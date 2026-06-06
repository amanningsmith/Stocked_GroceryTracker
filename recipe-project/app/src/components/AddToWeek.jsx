import { useEffect, useState } from 'react';
import { currentWeek } from '../lib/weeks';
import { addMeal } from '../state/store';

// Resolves any picked ISO date → its containing week (auto-creates the year's
// weeks via ensureWeeks if needed, so past/future dates just work).
export default function AddToWeek({ recipe, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [week, setWeek] = useState(null);
  const [slot, setSlot] = useState('dinner');
  const [servings, setServings] = useState(2);
  const [resolving, setResolving] = useState(false);

  useEffect(() => { resolve(date); }, [date]);

  async function resolve(isoDate) {
    if (!isoDate) return;
    setResolving(true);
    setWeek(null);
    const d = new Date(isoDate + 'T00:00:00Z');
    const w = await currentWeek(d.getUTCFullYear(), d);
    setWeek(w);
    setResolving(false);
  }

  async function save() {
    if (!week) return;
    await addMeal({ weekId: week.id, date, slot, recipeId: recipe.id, servings });
    onClose(true);
  }

  if (!recipe) return null;

  return (
    <div onClick={() => onClose(false)} style={overlay}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>Add to week</h3>
        <p className="meta" style={{ marginTop: 0, marginBottom: 14 }}>{recipe.name}</p>

        {/* Calendar date picker — any date, any year */}
        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Pick a day</label>
        <input
          className="input"
          type="date"
          value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          style={{ marginBottom: 8 }}
        />

        {/* Auto-detected week label */}
        <div style={{ minHeight: 22, marginBottom: 14 }}>
          {resolving && <span className="meta">Finding week…</span>}
          {!resolving && week && (
            <span className="meta">
              <span style={{ fontWeight: 600, color: 'var(--secondary-dark)' }}>Week {week.weekNumber}</span>
              {' · '}{fmt(week.startDate)} – {fmt(week.endDate)}
            </span>
          )}
          {!resolving && !week && date && (
            <span className="meta" style={{ color: 'var(--accent-dark)' }}>No week found for this date.</span>
          )}
        </div>

        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Slot</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['lunch', 'dinner'].map(s => (
            <button key={s} className={`chip ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)}>{s}</button>
          ))}
        </div>

        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Servings</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(n => (
            <button key={n} className={`chip ${servings === n ? 'active' : ''}`} onClick={() => setServings(n)}>{n}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!week || resolving}>
            {resolving ? 'Resolving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(58,46,38,0.35)',
  display: 'grid', placeItems: 'center', zIndex: 50, padding: 16,
};
