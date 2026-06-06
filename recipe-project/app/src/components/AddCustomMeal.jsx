import { useEffect, useState } from 'react';
import { currentWeek } from '../lib/weeks';
import { addMeal, appendShoppingLines } from '../state/store';

export default function AddCustomMeal({ defaultDate, defaultWeek, onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [slot, setSlot] = useState('dinner');
  const [week, setWeek] = useState(defaultWeek || null);
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
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

  function addIngredient() {
    const name = ingredientInput.trim();
    if (!name) return;
    setIngredients(prev => [...prev, name]);
    setIngredientInput('');
  }

  function handleIngredientKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); addIngredient(); }
  }

  async function save() {
    if (!week || !title.trim()) return;
    await addMeal({
      weekId: week.id, date, slot,
      recipeId: '__custom__', servings: 1,
      customTitle: title.trim(),
      customIngredients: ingredients,
    });
    if (ingredients.length) {
      await appendShoppingLines(week.id, ingredients, title.trim());
    }
    onClose(true);
  }

  return (
    <div onClick={() => onClose(false)} style={overlay}>
      <div className="card" onClick={e => e.stopPropagation()}
        style={{ width: 'min(420px, 92vw)', maxHeight: '90vh', overflowY: 'auto' }}>

        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Add custom meal</h3>

        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Meal title</label>
        <input
          className="input"
          placeholder="e.g. Tacos"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ marginBottom: 14 }}
          autoFocus
        />

        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Day</label>
        <input
          className="input"
          type="date"
          value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          style={{ marginBottom: 8 }}
        />
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['lunch', 'dinner'].map(s => (
            <button key={s} className={`chip ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)}>{s}</button>
          ))}
        </div>

        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Ingredients</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            placeholder="e.g. chicken"
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={handleIngredientKey}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={addIngredient}>Add</button>
        </div>

        {ingredients.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {ingredients.map((ing, i) => (
              <span key={i} style={chip}>
                {ing}
                <button
                  onClick={() => setIngredients(prev => prev.filter((_, idx) => idx !== i))}
                  style={chipX}
                  aria-label={`Remove ${ing}`}
                >×</button>
              </span>
            ))}
          </div>
        )}
        {ingredients.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            No ingredients yet — add some above and they'll go straight to your grocery list.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!title.trim() || !week || resolving}
          >
            {resolving ? 'Resolving…' : 'Save meal'}
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

const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'var(--secondary)', color: 'var(--text-primary)',
  borderRadius: 999, padding: '3px 10px', fontSize: 13, fontWeight: 500,
};

const chipX = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-hint)', fontSize: 15, padding: 0, lineHeight: 1,
};
