import { useState } from 'react';
import RecipeRow from '../components/RecipeRow';
import AddToWeek from '../components/AddToWeek';
import { searchRecipes, getRecipe } from '../api/spoonacular';
import { saveRecipe } from '../state/store';
import { sortByOverlap } from '../lib/overlap';
import { currentWeek } from '../lib/weeks';
import { weekRecipesWithServings } from '../state/store';

// Seven filters per spec MVP1.
const CUISINES = ['Italian', 'Mexican', 'Indian', 'Chinese', 'Thai', 'Japanese', 'Mediterranean', 'American', 'French'];
const PROTEINS = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'turkey', 'lamb'];
const METHODS = ['bake', 'grill', 'sauté', 'roast', 'slow cook', 'stir fry'];
const DIETS = ['vegetarian', 'vegan', 'gluten free', 'dairy free'];
const MEAL_TYPES = ['main course', 'side dish', 'soup', 'salad'];
const TIMES = [15, 30, 45, 60];

function Chip({ active, children, onClick }) {
  return <button className={`chip ${active ? 'active' : ''}`} onClick={onClick} style={{ marginRight: 6, marginBottom: 6 }}>{children}</button>;
}

export default function FinderScreen({ onOpen }) {
  const [text, setText] = useState('');
  const [f, setF] = useState({});                 // active filters
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [addTarget, setAddTarget] = useState(null);
  const [overlapSort, setOverlapSort] = useState(false);

  const toggle = (key, val) => setF((p) => ({ ...p, [key]: p[key] === val ? undefined : val }));

  async function run(reset = true) {
    setLoading(true); setErr('');
    const nextOffset = reset ? 0 : offset + 100;
    try {
      const { results: r, total: t } = await searchRecipes({
        query: text || undefined,
        cuisine: f.cuisine, protein: f.protein, mealType: f.mealType,
        diet: f.diet, maxTime: f.maxTime, number: 100, offset: nextOffset,
      });
      // Cache to SQLite so re-browsing doesn't re-spend quota (spec §2).
      for (const rec of r) await saveRecipe(rec);
      let merged = reset ? r : [...results, ...r];
      if (overlapSort) merged = await applyOverlap(merged);
      setResults(merged); setTotal(t); setOffset(nextOffset);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyOverlap(list) {
    const w = await currentWeek();
    if (!w) return list;
    const weekRecipes = (await weekRecipesWithServings(w.id)).map((x) => x.recipe);
    return sortByOverlap(list, weekRecipes).map((x) => x.recipe);
  }

  async function open(recipe) {
    // Hydrate full recipe (ingredients + steps) on open, then cache.
    try {
      if (recipe.source === 'spoonacular' && (!recipe.steps || recipe.steps.length === 0)) {
        const full = await getRecipe(recipe.id.replace('sp_', ''));
        await saveRecipe(full);
        onOpen(full.id);
        return;
      }
    } catch { /* fall through to open the lightweight version */ }
    onOpen(recipe.id);
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Find a recipe</h1>

      <div className="row-flex" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Search name or ingredient…"
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(true)} />
        <button className="btn btn-primary" onClick={() => run(true)}>Search</button>
      </div>

      <details style={{ marginBottom: 12 }}>
        <summary className="meta" style={{ cursor: 'pointer', marginBottom: 8 }}>Filters</summary>
        <FilterGroup label="Cuisine" opts={CUISINES} val={f.cuisine} on={(v) => toggle('cuisine', v)} />
        <FilterGroup label="Protein" opts={PROTEINS} val={f.protein} on={(v) => toggle('protein', v)} />
        <FilterGroup label="Method" opts={METHODS} val={f.method} on={(v) => toggle('method', v)} />
        <FilterGroup label="Diet" opts={DIETS} val={f.diet} on={(v) => toggle('diet', v)} />
        <FilterGroup label="Meal type" opts={MEAL_TYPES} val={f.mealType} on={(v) => toggle('mealType', v)} />
        <FilterGroup label="Max time" opts={TIMES.map((t) => `${t} min`)} val={f.maxTime && `${f.maxTime} min`}
          on={(v) => toggle('maxTime', parseInt(v))} />
        <label className="meta" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" checked={overlapSort} onChange={(e) => setOverlapSort(e.target.checked)} />
          Sort by shared ingredients with this week
        </label>
      </details>

      {err && <p style={{ color: 'var(--accent-dark)' }}>{err}</p>}
      {loading && <p className="meta">Loading…</p>}

      {results.map((r, i) => (
        <RecipeRow key={r.id} recipe={r} delay={Math.min(i, 12) * 30}
          onOpen={open} onAdd={(rec) => setAddTarget(rec)} />
      ))}

      {results.length > 0 && results.length < total && (
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}
          onClick={() => run(false)}>Load 100 more ({results.length}/{total})</button>
      )}

      {addTarget && <AddToWeek recipe={addTarget} onClose={() => setAddTarget(null)} />}
    </div>
  );
}

function FilterGroup({ label, opts, val, on }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div className="meta" style={{ marginBottom: 4 }}>{label}</div>
      <div>{opts.map((o) => <Chip key={o} active={val === o} onClick={() => on(o)}>{o}</Chip>)}</div>
    </div>
  );
}
