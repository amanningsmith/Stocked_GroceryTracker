import { useEffect, useState } from 'react';
import RecipeRow from '../components/RecipeRow';
import AddToWeek from '../components/AddToWeek';
import { listFavorites, deleteRecipe, weekRecipesWithServings } from '../state/store';
import { sortByOverlap } from '../lib/overlap';
import { currentWeek } from '../lib/weeks';

const CUISINES   = ['Italian','Mexican','Indian','Chinese','Thai','Japanese','Mediterranean','American','French','Greek','Korean'];
const PROTEINS   = ['chicken','beef','pork','fish','shrimp','tofu','turkey','lamb','seafood','vegetarian','vegan'];
const METHODS    = ['bake','grill','sauté','roast','slow cook','stir fry','skillet','oven','simmer','wok','braise'];
const DIETS      = ['vegetarian','vegan','gluten free','dairy free','low-carb'];
const MEAL_TYPES = ['main course','side dish','soup','salad'];
const TIMES      = [15, 30, 45, 60];

// Normalize diet strings so 'gluten free' matches stored 'gluten-free' etc.
const norm = s => s.toLowerCase().replace(/[-\s]/g, '');

function applyFilters(recipes, text, f) {
  return recipes.filter(r => {
    if (text) {
      const t = text.toLowerCase();
      const ingNames = (r.ingredients || []).map(i => (i.name || '').toLowerCase());
      const haystack = [r.name, r.cuisine, r.protein, ...(r.macroContributors || []), ...ingNames];
      if (!haystack.some(s => s?.toLowerCase().includes(t))) return false;
    }
    if (f.cuisine  && !r.cuisine?.toLowerCase().includes(f.cuisine.toLowerCase()))          return false;
    if (f.protein  && !r.protein?.toLowerCase().includes(f.protein.toLowerCase()))          return false;
    if (f.method   && !r.method?.toLowerCase().includes(f.method.toLowerCase()))            return false;
    if (f.diet     && !(r.dietaryTags || []).some(tag => norm(tag) === norm(f.diet)))       return false;
    if (f.mealType && !r.method?.toLowerCase().includes(f.mealType.toLowerCase()))          return false;
    if (f.maxTime  && r.totalTimeMinutes && r.totalTimeMinutes > f.maxTime)                 return false;
    return true;
  });
}

export default function FavoritesScreen({ onOpen }) {
  const [all, setAll] = useState([]);
  const [text, setText] = useState('');
  const [f, setF] = useState({});
  const [overlapSort, setOverlapSort] = useState(false);
  const [weekRecipes, setWeekRecipes] = useState([]);
  const [addTarget, setAddTarget] = useState(null);

  const load = () => listFavorites().then(setAll);
  useEffect(() => { load(); }, []);

  // Load current week's recipes once so overlap sort is synchronous in render
  useEffect(() => {
    currentWeek().then(async w => {
      if (!w) return;
      const items = await weekRecipesWithServings(w.id);
      setWeekRecipes(items.map(x => x.recipe));
    });
  }, []);

  const toggle = (key, val) => setF(p => ({ ...p, [key]: p[key] === val ? undefined : val }));
  const clearAll = () => { setF({}); setText(''); };
  const activeCount = Object.values(f).filter(Boolean).length + (text ? 1 : 0);

  async function handleDelete(recipeId) {
    try { await deleteRecipe(recipeId); load(); }
    catch (e) { console.error(e); }
  }

  // All filtering is in-memory — instant, no API
  let displayed = applyFilters(all, text, f);
  if (overlapSort && weekRecipes.length > 0) {
    displayed = sortByOverlap(displayed, weekRecipes).map(x => x.recipe);
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Saved recipes</h1>

      {/* Search — filters instantly, no button needed */}
      <input className="input" placeholder="Search saved recipes…"
        value={text} onChange={e => setText(e.target.value)}
        style={{ marginBottom: 10 }} />

      {/* Active filter pills */}
      {activeCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {text && (
            <button onClick={() => setText('')}
              style={{ background: 'var(--accent-tint)', color: 'var(--accent-dark)', border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              "{text}" ✕
            </button>
          )}
          {Object.entries(f).map(([k, v]) => v && (
            <button key={k} onClick={() => toggle(k, v)}
              style={{ background: 'var(--accent-tint)', color: 'var(--accent-dark)', border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {v} ✕
            </button>
          ))}
          <button onClick={clearAll}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel — identical structure to FinderScreen */}
      <details style={{ marginBottom: 12 }}>
        <summary style={{
          cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 999, border: '1.5px solid var(--border-chip)',
          width: 'fit-content', marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          ⊞ Filters {activeCount > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 6px', fontWeight: 600 }}>
              {activeCount}
            </span>
          )}
        </summary>

        <FilterRow label="Cuisine"   opts={CUISINES}                    val={f.cuisine}  on={v => toggle('cuisine', v)} />
        <FilterRow label="Protein"   opts={PROTEINS}                    val={f.protein}  on={v => toggle('protein', v)} />
        <FilterRow label="Method"    opts={METHODS}                     val={f.method}   on={v => toggle('method', v)} />
        <FilterRow label="Diet"      opts={DIETS}                       val={f.diet}     on={v => toggle('diet', v)} />
        <FilterRow label="Meal type" opts={MEAL_TYPES}                  val={f.mealType} on={v => toggle('mealType', v)} />
        <FilterRow label="Max time"  opts={TIMES.map(t => `${t} min`)} val={f.maxTime && `${f.maxTime} min`} on={v => toggle('maxTime', parseInt(v))} />

        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>
          <input type="checkbox" checked={overlapSort} onChange={e => setOverlapSort(e.target.checked)} />
          Sort by this week's overlap
        </label>
      </details>

      {/* Result states */}
      {all.length === 0 && (
        <p className="meta">No favorites yet — tap the heart on any recipe.</p>
      )}
      {all.length > 0 && displayed.length === 0 && (
        <p className="meta">No saved recipes match these filters.</p>
      )}
      {all.length > 0 && activeCount === 0 && (
        <p className="meta" style={{ marginBottom: 10 }}>{all.length} saved recipe{all.length !== 1 ? 's' : ''}</p>
      )}
      {all.length > 0 && activeCount > 0 && displayed.length > 0 && (
        <p className="meta" style={{ marginBottom: 10 }}>{displayed.length} of {all.length} recipes</p>
      )}

      {displayed.map((r, i) => (
        <RecipeRow key={r.id} recipe={r} delay={Math.min(i, 12) * 30}
          onOpen={() => onOpen(r.id)} onAdd={rec => setAddTarget(rec)} onDelete={handleDelete} />
      ))}

      {addTarget && <AddToWeek recipe={addTarget} onClose={() => { setAddTarget(null); load(); }} />}
    </div>
  );
}

function FilterRow({ label, opts, val, on }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="meta" style={{ marginBottom: 5, fontWeight: 600 }}>{label}</div>
      <div className="scroll-x">
        {opts.map(o => (
          <button key={o} className={`chip ${val === o ? 'active' : ''}`} onClick={() => on(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
