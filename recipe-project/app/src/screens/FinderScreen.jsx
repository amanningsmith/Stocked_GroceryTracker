import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import RecipeRow from '../components/RecipeRow';
import AddToWeek from '../components/AddToWeek';
import { searchRecipes, getRecipe, fetchImageForName } from '../api/spoonacular';
import { saveRecipe, searchLocal, getImportedRecipes, deleteRecipe, listRecipes } from '../state/store';
import { sortByOverlap } from '../lib/overlap';
import { currentWeek } from '../lib/weeks';
import { weekRecipesWithServings } from '../state/store';

const CUISINES   = ['Italian','Mexican','Indian','Chinese','Thai','Japanese','Mediterranean','American','French','Greek','Korean'];
const PROTEINS   = ['chicken','beef','pork','fish','shrimp','tofu','turkey','lamb','seafood','vegetarian','vegan'];
const METHODS    = ['bake','grill','sauté','roast','slow cook','stir fry','skillet','oven','simmer','wok','braise'];
const DIETS      = ['vegetarian','vegan','gluten free','dairy free','low-carb'];
const MEAL_TYPES = ['main course','side dish','soup','salad'];
const TIMES      = [15, 30, 45, 60];

// Module-level cache — survives tab switches (component unmount/remount) for the session.
// Cleared only on full page reload. Avoids re-fetching the API every time the user
// returns to the Find tab.
let _cache = null; // { results: Recipe[], total: number, offset: number } | null

export default function FinderScreen({ onOpen }) {
  const [text, setText] = useState('');
  const [f, setF] = useState({});
  const [results, setResults] = useState(() => _cache?.results ?? []);
  const [total, setTotal] = useState(() => _cache?.total ?? 0);
  const [offset, setOffset] = useState(() => _cache?.offset ?? 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [addTarget, setAddTarget] = useState(null);
  const [overlapSort, setOverlapSort] = useState(false);
  const [hideImported, setHideImported] = useState(false);
  const [hideApi, setHideApi] = useState(false);

  // Only auto-load on the very first mount this session.
  // Subsequent mounts (tab switches back) restore from _cache instantly.
  useEffect(() => { if (!_cache) run(true, true); }, []);

  const toggle = (key, val) => setF((p) => ({ ...p, [key]: p[key] === val ? undefined : val }));
  const clearFilters = () => setF({});
  const activeFilterCount = Object.values(f).filter(Boolean).length;

  async function run(reset = true, isAutoLoad = false) {
    setLoading(true); setErr('');
    const nextOffset = reset ? 0 : offset + 100;
    let newTotal = total;
    try {
      let apiResults = [];
      let localResults = [];

      // Always load imported recipes from local DB
      try { localResults = await getImportedRecipes(); } catch {}

      // Decide whether to call Spoonacular
      let callApi = true;
      if (isAutoLoad && !text && !activeFilterCount) {
        // On mount with no filters: only call API once per day to protect quota.
        const { value: lastDate } = await Preferences.get({ key: 'finder_auto_date' });
        const today = new Date().toISOString().slice(0, 10);
        if (lastDate === today) {
          callApi = false;
          try {
            const cached = await listRecipes();
            apiResults = cached.filter(r => r.source === 'spoonacular');
          } catch {}
        } else {
          await Preferences.set({ key: 'finder_auto_date', value: today });
        }
      }

      if (callApi) {
        try {
          const { results: r, total: t } = await searchRecipes({
            query: text || undefined,
            cuisine: f.cuisine, protein: f.protein, mealType: f.mealType,
            diet: f.diet, maxTime: f.maxTime, number: 100, offset: nextOffset,
          });
          for (const rec of r) await saveRecipe(rec);
          apiResults = r;
          newTotal = t;
          setTotal(t);
        } catch (e) {
          if (!isAutoLoad) setErr(e.message);
        }
      }

      if (text) {
        try {
          const local = await searchLocal(text);
          localResults = local.filter(r => r.source === 'imported');
        } catch {}
      }

      const seen = new Set();
      let merged = [];
      for (const rec of [...apiResults, ...localResults]) {
        if (!seen.has(rec.id)) { seen.add(rec.id); merged.push(rec); }
      }

      if (!reset) merged = [...results, ...merged];
      if (overlapSort && merged.length > 0) merged = await applyOverlap(merged);

      setResults(merged);
      setOffset(nextOffset);
      _cache = { results: merged, total: newTotal, offset: nextOffset };
    } catch (e) {
      if (e.message && !e.message.includes('quota')) setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyOverlap(list) {
    const w = await currentWeek();
    if (!w) return list;
    const weekRecipes = (await weekRecipesWithServings(w.id)).map(x => x.recipe);
    return sortByOverlap(list, weekRecipes).map(x => x.recipe);
  }

  async function handleDelete(recipeId) {
    try {
      await deleteRecipe(recipeId);
      setResults(prev => {
        const next = prev.filter(r => r.id !== recipeId);
        _cache = _cache ? { ..._cache, results: next } : null;
        return next;
      });
    } catch (e) { setErr('Delete failed: ' + e.message); }
  }

  async function open(recipe) {
    try {
      if (recipe.source === 'spoonacular' && (!recipe.steps || !recipe.steps.length)) {
        const full = await getRecipe(recipe.id.replace('sp_', ''));
        await saveRecipe(full);
        onOpen(full.id);
        return;
      }
    } catch {}
    if (recipe.source === 'imported' && !recipe.image) {
      fetchImageForName(recipe.name).then(async (img) => {
        if (img) await saveRecipe({ ...recipe, image: img });
      });
    }
    onOpen(recipe.id);
  }

  const displayResults = results.filter(r =>
    (!hideImported || r.source !== 'imported') &&
    (!hideApi     || r.source !== 'spoonacular'),
  );

  return (
    <div className="screen">
      <h1 className="screen-title">Find a recipe</h1>

      {/* Search bar */}
      <div className="row-flex" style={{ marginBottom: 10 }}>
        <input className="input" placeholder="Search name or ingredient…"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run(true)} />
        <button className="btn btn-primary" onClick={() => run(true)}>Search</button>
      </div>

      {/* Active filter pills — tap to remove */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {Object.entries(f).map(([k, v]) => v && (
            <button key={k} onClick={() => toggle(k, v)}
              style={{ background: 'var(--accent-tint)', color: 'var(--accent-dark)', border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {v} ✕
            </button>
          ))}
          <button onClick={clearFilters}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
            Clear all
          </button>
        </div>
      )}

      {/* Collapsible filter panel */}
      <details style={{ marginBottom: 12 }}>
        <summary style={{
          cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 999, border: '1.5px solid var(--border-chip)',
          width: 'fit-content', marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          ⊞ Filters {activeFilterCount > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 6px', fontWeight: 600 }}>
              {activeFilterCount}
            </span>
          )}
        </summary>

        <FilterRow label="Cuisine"   opts={CUISINES}                     val={f.cuisine}  on={v => toggle('cuisine', v)} />
        <FilterRow label="Protein"   opts={PROTEINS}                     val={f.protein}  on={v => toggle('protein', v)} />
        <FilterRow label="Method"    opts={METHODS}                      val={f.method}   on={v => toggle('method', v)} />
        <FilterRow label="Diet"      opts={DIETS}                        val={f.diet}     on={v => toggle('diet', v)} />
        <FilterRow label="Meal type" opts={MEAL_TYPES}                   val={f.mealType} on={v => toggle('mealType', v)} />
        <FilterRow label="Max time"  opts={TIMES.map(t => `${t} min`)}  val={f.maxTime && `${f.maxTime} min`} on={v => toggle('maxTime', parseInt(v))} />

        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={overlapSort} onChange={e => setOverlapSort(e.target.checked)} />
            Sort by this week's overlap
          </label>
          <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={hideImported} onChange={e => setHideImported(e.target.checked)} />
            Hide imported
          </label>
          <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={hideApi} onChange={e => setHideApi(e.target.checked)} />
            Hide API recipes
          </label>
        </div>
      </details>

      {err && <p style={{ color: 'var(--accent-dark)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      {loading && <p className="meta">Loading…</p>}
      {!loading && !err && displayResults.length === 0 && (
        <p className="meta">No recipes yet — tap Search or add filters above.</p>
      )}

      {displayResults.map((r, i) => (
        <RecipeRow key={r.id} recipe={r} delay={Math.min(i, 12) * 30}
          onOpen={open} onAdd={rec => setAddTarget(rec)} onDelete={handleDelete} />
      ))}

      {results.length > 0 && results.length < total && (
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}
          onClick={() => run(false)}>Load 100 more ({results.length}/{total})</button>
      )}

      {addTarget && <AddToWeek recipe={addTarget} onClose={() => setAddTarget(null)} />}
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
