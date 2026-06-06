import { useState } from 'react';
import { addShoppingLine, addPantryItem } from '../state/store';
import { SECTION_ORDER } from '../lib/sections';

export default function AddShoppingItem({ weekId, onClose }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [section, setSection] = useState('Other');
  const [toPantry, setToPantry] = useState(false);
  const [lifespanWeeks, setLifespanWeeks] = useState(2);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await addShoppingLine(weekId, {
        name: name.trim(),
        mergedQty: qty ? parseFloat(qty) : null,
        unit: unit.trim(),
        section,
        source: toPantry ? 'pantry' : 'manual',
      });
      if (toPantry) {
        await addPantryItem({
          name: name.trim(),
          section,
          lifespanWeeks: Math.max(1, lifespanWeeks),
          buyQty: qty ? parseFloat(qty) : null,
        });
      }
      onClose(true);
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && canSave) save();
  }

  return (
    <div onClick={() => onClose(false)} style={overlay}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 'min(400px, 92vw)' }}>
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Add to shopping list</h3>

        {/* Name */}
        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Item name</label>
        <input
          className="input"
          placeholder="e.g. olive oil"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKey}
          style={{ marginBottom: 14 }}
          autoFocus
        />

        {/* Qty + Unit */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Qty (optional)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.25"
              placeholder="e.g. 2"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Unit (optional)</label>
            <input
              className="input"
              placeholder="e.g. cups"
              value={unit}
              onChange={e => setUnit(e.target.value)}
            />
          </div>
        </div>

        {/* Section */}
        <label className="meta" style={{ display: 'block', marginBottom: 6 }}>Section</label>
        <select
          className="input"
          value={section}
          onChange={e => setSection(e.target.value)}
          style={{ marginBottom: 16 }}
        >
          {SECTION_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Pantry toggle */}
        <div style={{
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 14, marginBottom: 14,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => setToPantry(p => !p)}
              style={{
                width: 40, height: 22, borderRadius: 999, flexShrink: 0,
                background: toPantry ? 'var(--accent)' : 'var(--border-chip)',
                position: 'relative', transition: 'background 0.2s ease', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: toPantry ? 20 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }} />
            </div>
            <span className="meta" style={{ fontWeight: 600 }}>
              Also save to pantry
            </span>
          </label>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, marginLeft: 50 }}>
            Pantry items auto-appear on the shopping list when it's time to restock.
          </p>
        </div>

        {/* Lifespan — only when pantry toggle is on */}
        {toPantry && (
          <div style={{ marginBottom: 16, paddingLeft: 50 }}>
            <label className="meta" style={{ display: 'block', marginBottom: 6 }}>
              Restock every (weeks)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="input"
                type="number"
                min="1"
                step="0.5"
                value={lifespanWeeks}
                onChange={e => setLifespanWeeks(parseFloat(e.target.value) || 1)}
                style={{ width: 90 }}
              />
              <span className="meta">
                {lifespanWeeks === 1 ? 'week' : 'weeks'} · next restock approx.{' '}
                <strong>{nextRestockLabel(lifespanWeeks)}</strong>
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!canSave || saving}
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextRestockLabel(lifespanWeeks) {
  const ms = lifespanWeeks * 7 * 24 * 60 * 60 * 1000;
  const d = new Date(Date.now() + ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(58,46,38,0.35)',
  display: 'grid', placeItems: 'center', zIndex: 50, padding: 16,
};
