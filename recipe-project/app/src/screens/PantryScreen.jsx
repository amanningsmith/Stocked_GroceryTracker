import { useEffect, useState } from 'react';
import { query, run, uid } from '../db/db';

// Pantry screen (spec §5). v1 here covers item CRUD + the TIME-BASED restock
// signal (time since last purchase >= lifespan -> suggest). The usage-based
// signal (Idea #3) and the accept/deny surfacing on the weekly list are STUBBED
// — see GAPS.md. This is intentionally the thin end of the pantry subsystem.
const COLS = ['id', 'name', 'section', 'buyQty', 'lifespanWeeks', 'lastPurchased', 'level'];

export default function PantryScreen() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [lifespan, setLifespan] = useState(2);

  const load = () => query('SELECT * FROM pantry_item ORDER BY name').then(setItems);
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    await run(
      `INSERT INTO pantry_item (id, name, section, buyQty, lifespanWeeks, lastPurchased, level) VALUES (?,?,?,?,?,?,?)`,
      [uid('pan'), name.trim(), 'Other', 1, lifespan, new Date().toISOString().slice(0, 10), 1],
    );
    setName(''); load();
  }

  // Time-based suggestion: weeks since lastPurchased >= lifespanWeeks.
  function isDue(item) {
    if (!item.lastPurchased || !item.lifespanWeeks) return false;
    const weeks = (Date.now() - new Date(item.lastPurchased).getTime()) / (7 * 864e5);
    return weeks >= item.lifespanWeeks;
  }

  async function restock(item) {
    await run('UPDATE pantry_item SET lastPurchased = ?, level = 1 WHERE id = ?',
      [new Date().toISOString().slice(0, 10), item.id]);
    load();
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Pantry</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="meta">Lifespan (weeks)</label>
        <input className="input" type="number" min={1} value={lifespan} onChange={(e) => setLifespan(+e.target.value)} style={{ margin: '4px 0 10px' }} />
        <button className="btn btn-primary" onClick={add}>Add item</button>
      </div>

      {items.map((it) => (
        <div key={it.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div>{it.name}</div>
            <div className="meta">every {it.lifespanWeeks} wk · last {it.lastPurchased}</div>
          </div>
          {isDue(it)
            ? <button className="btn btn-secondary" onClick={() => restock(it)}>Restocked ✓</button>
            : <span className="pill tag-sage">ok</span>}
        </div>
      ))}
    </div>
  );
}
