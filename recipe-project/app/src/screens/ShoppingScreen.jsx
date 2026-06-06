import { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { currentWeek, ensureWeeks, generateWeeks } from '../lib/weeks';
import {
  weekRecipesWithServings, replaceShoppingLines, shoppingLinesForWeek,
  setLineStatus, customIngredientsForWeek, pantryItemsDueInWeek, addShoppingLine,
} from '../state/store';
import { buildShoppingLines, groupBySection, listToText } from '../lib/shoppingList';
import AddShoppingItem from '../components/AddShoppingItem';

// Weekly shopping list (MVP3): auto-build from week's recipes, merge quantities,
// group by store section, have/need toggle, export to Notes/Messages via Share.
export default function ShoppingScreen() {
  const year = new Date().getUTCFullYear();
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [grouped, setGrouped] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureWeeks(year);
      setWeeks(generateWeeks(year));
      setWeek(await currentWeek(year));
    })();
  }, [year]);

  useEffect(() => { if (week) loadOrBuild(week); }, [week]);

  // Passing the full week object so regenerate can compare pantry restock
  // dates against the week's startDate/endDate without an extra DB lookup.
  async function loadOrBuild(w) {
    let lines = await shoppingLinesForWeek(w.id);
    if (!lines.length) lines = await regenerate(w);
    setGrouped(groupBySection(lines));
  }

  async function regenerate(w) {
    const recipes     = await weekRecipesWithServings(w.id);
    const recipeLines = buildShoppingLines(recipes);
    const customLines = await customIngredientsForWeek(w.id);
    const pantryLines = await pantryItemsDueInWeek(w.startDate, w.endDate);
    await replaceShoppingLines(w.id, [...recipeLines, ...customLines, ...pantryLines]);
    const persisted = await shoppingLinesForWeek(w.id);
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
    try {
      await Share.share({ title: 'Shopping list', text });
    } catch {
      await navigator.clipboard?.writeText(text);
    }
  }

  async function handleAddClose(saved) {
    setShowAddItem(false);
    if (saved) setGrouped(groupBySection(await shoppingLinesForWeek(week.id)));
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => regenerate(week)}>Rebuild from week</button>
        <button className="btn btn-secondary" onClick={() => setShowAddItem(true)}>+ Add item</button>
        <button className="btn btn-primary" onClick={exportList}>Export</button>
      </div>

      {grouped.length === 0 && <p className="meta">No items yet — add recipes to this week or tap "Add item".</p>}

      {grouped.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: 'var(--secondary-dark)', fontFamily: 'var(--font-display)', fontSize: 14 }}>
              {section}
            </span>
          </div>
          {items.map((line) => (
            <div key={line.id} className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, opacity: line.status === 'have' ? 0.55 : 1 }}
              onClick={() => toggle(line)}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `1.5px solid var(--accent)`,
                background: line.status === 'have' ? 'var(--accent)' : 'transparent',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14,
                transition: 'background 0.15s ease',
              }}>{line.status === 'have' ? '✓' : ''}</span>
              <span style={{ flex: 1, textDecoration: line.status === 'have' ? 'line-through' : 'none' }}>
                {line.mergedQty ? `${line.mergedQty}${line.unit ? ' ' + line.unit : ''} ` : ''}{line.name}
              </span>
              {line.source === 'pantry' && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--secondary-dark)',
                  background: 'var(--secondary)', borderRadius: 999, padding: '2px 6px',
                  flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>pantry</span>
              )}
            </div>
          ))}
        </div>
      ))}

      {showAddItem && (
        <AddShoppingItem weekId={week.id} onClose={handleAddClose} />
      )}
    </div>
  );
}
