import { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { currentWeek, ensureWeeks, generateWeeks } from '../lib/weeks';
import { weekRecipesWithServings, replaceShoppingLines, shoppingLinesForWeek, setLineStatus } from '../state/store';
import { buildShoppingLines, groupBySection, listToText } from '../lib/shoppingList';

// Weekly shopping list (MVP3): auto-build from week's recipes, merge quantities,
// group by store section, have/need toggle, export to Notes/Messages via Share.
export default function ShoppingScreen() {
  const year = new Date().getUTCFullYear();
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [grouped, setGrouped] = useState([]);

  useEffect(() => {
    (async () => {
      await ensureWeeks(year);
      setWeeks(generateWeeks(year));
      setWeek(await currentWeek(year));
    })();
  }, [year]);

  useEffect(() => { if (week) loadOrBuild(week.id); }, [week]);

  async function loadOrBuild(weekId) {
    let lines = await shoppingLinesForWeek(weekId);
    if (!lines.length) lines = await regenerate(weekId);
    setGrouped(groupBySection(lines));
  }

  async function regenerate(weekId) {
    const recipes = await weekRecipesWithServings(weekId);
    const lines = buildShoppingLines(recipes);
    await replaceShoppingLines(weekId, lines);
    const persisted = await shoppingLinesForWeek(weekId);
    setGrouped(groupBySection(persisted));
    return persisted;
  }

  async function toggle(line) {
    const next = line.status === 'need' ? 'have' : 'need';
    await setLineStatus(line.id, next);
    setGrouped(groupBySection(await shoppingLinesForWeek(week.id)));
  }

  async function exportList() {
    const text = listToText(grouped, { onlyNeeded: true });
    // Capacitor Share opens the native sheet → Notes, Messages, etc. (spec export targets).
    try {
      await Share.share({ title: 'Shopping list', text });
    } catch {
      await navigator.clipboard?.writeText(text); // web fallback
    }
  }

  if (!week) return <div className="screen"><p className="meta">Loading…</p></div>;

  return (
    <div className="screen">
      <h1 className="screen-title">Shopping list</h1>

      <select className="input" value={week.id}
        onChange={(e) => setWeek(weeks.find((w) => w.id === e.target.value))}
        style={{ marginBottom: 12 }}>
        {weeks.map((w) => <option key={w.id} value={w.id}>Week {w.weekNumber}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-secondary" onClick={() => regenerate(week.id)}>Rebuild from week</button>
        <button className="btn btn-primary" onClick={exportList}>Export</button>
      </div>

      {grouped.length === 0 && <p className="meta">No recipes attached to this week yet.</p>}

      {grouped.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--secondary-dark)', fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 6 }}>{section}</div>
          {items.map((line) => (
            <div key={line.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, opacity: line.status === 'have' ? 0.55 : 1 }}
              onClick={() => toggle(line)}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `1.5px solid var(--accent)`, background: line.status === 'have' ? 'var(--accent)' : 'transparent',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, transition: 'background 0.15s ease',
              }}>{line.status === 'have' ? '✓' : ''}</span>
              <span style={{ flex: 1, textDecoration: line.status === 'have' ? 'line-through' : 'none' }}>
                {line.mergedQty ? `${line.mergedQty}${line.unit ? ' ' + line.unit : ''} ` : ''}{line.name}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
