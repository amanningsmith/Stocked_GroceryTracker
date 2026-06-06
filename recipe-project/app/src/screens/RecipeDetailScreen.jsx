import { useEffect, useState } from 'react';
import { getRecipeById, logsForRecipe, addCookLog, toggleFavorite, isFavorite } from '../state/store';
import { placeholderGradient } from '../lib/colorUtil';
import AddToWeek from '../components/AddToWeek';

export default function RecipeDetailScreen({ recipeId, onBack, onCook }) {
  const [recipe, setRecipe] = useState(null);
  const [logs, setLogs] = useState([]);
  const [fav, setFav] = useState(false);
  const [addTarget, setAddTarget] = useState(null);
  const [logging, setLogging] = useState(false);

  const load = async () => {
    setRecipe(await getRecipeById(recipeId));
    setLogs(await logsForRecipe(recipeId));
    setFav(await isFavorite(recipeId));
  };
  useEffect(() => { load(); }, [recipeId]);

  if (!recipe) return <div className="screen"><p className="meta">Loading…</p></div>;

  const avg = logs.length
    ? (logs.reduce((s, l) => s + (l.rating || 0), 0) / logs.filter((l) => l.rating).length).toFixed(1)
    : null;
  const latest = logs[0];

  return (
    <div className="screen" style={{ padding: 0 }}>
      {/* Hero — 16:9 image or gradient banner */}
      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: placeholderGradient(recipe.name), display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 64, opacity: 0.5 }}>🍽️</span>
          </div>
        )}
        {/* Back button overlay */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(0,0,0,0.40)', border: 'none', borderRadius: 999,
            color: '#fff', padding: '6px 14px', fontSize: 13, fontWeight: 600, backdropFilter: 'blur(6px)',
          }}>← Back</button>
        {/* Favorite overlay */}
        <button
          onClick={() => toggleFavorite(recipe.id).then(setFav)}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.40)', border: 'none', borderRadius: 999,
            color: fav ? '#FF6B6B' : '#fff', fontSize: 22, padding: '4px 10px', backdropFilter: 'blur(6px)',
          }}>{fav ? '♥' : '♡'}</button>
      </div>

      {/* Content area */}
      <div style={{ padding: '16px var(--pad-page) 96px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{recipe.name}</h1>
        <p className="meta" style={{ marginBottom: 14 }}>
          {[recipe.cuisine, recipe.totalTimeMinutes && `${recipe.totalTimeMinutes} min`, recipe.difficulty,
            `serves ${recipe.servings}`].filter(Boolean).join(' · ')}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => onCook(recipe.id)}>Cook this</button>
          <button className="btn btn-secondary" onClick={() => setAddTarget(recipe)}>Add to week</button>
        </div>

        {recipe.description && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            {recipe.description}
          </p>
        )}

        {/* Cooking history */}
        <div className="card" style={{ margin: '0 0 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>Cooking history</h3>
            {avg && <span className="pill tag-sage">★ {avg} avg · {logs.length} made</span>}
          </div>
          {!logs.length && <p className="meta" style={{ marginBottom: 0 }}>Not cooked yet.</p>}
          {latest && (
            <div className="meta" style={{ marginTop: 6 }}>
              <strong>Latest ({latest.dateMade}):</strong> {latest.rating ? '★'.repeat(latest.rating) : ''}{' '}
              {latest.notes}{latest.adjustments ? ` — adj: ${latest.adjustments}` : ''}
            </div>
          )}
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setLogging(true)}>Log a cook</button>
        </div>

        <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Ingredients</h3>
        <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
          {(recipe.ingredients || []).map((i, k) => (
            <li key={k} style={{ marginBottom: 4, fontSize: 14 }}>
              {i.amount ? `${i.amount} ${i.unit || ''} ` : ''}{i.name}
              {i.isStaple && <span className="pill tag-sage" style={{ marginLeft: 6 }}>staple</span>}
            </li>
          ))}
        </ul>

        <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Steps</h3>
        <ol style={{ margin: '0 0 16px', paddingLeft: 18 }}>
          {(recipe.steps || []).map((s) => (
            <li key={s.number} style={{ marginBottom: 10, fontSize: 14, lineHeight: 1.6 }}>{s.instruction}</li>
          ))}
        </ol>

        {recipe.tip && (
          <div className="card" style={{ background: 'var(--accent-tint)', borderColor: 'var(--accent-tint)' }}>
            <strong style={{ color: 'var(--accent-dark)' }}>Tip </strong>
            <span style={{ color: 'var(--accent-dark)', fontSize: 14 }}>{recipe.tip}</span>
          </div>
        )}
      </div>

      {addTarget && <AddToWeek recipe={addTarget} onClose={() => setAddTarget(null)} />}
      {logging && <CookLogForm recipeId={recipe.id} onClose={(saved) => { setLogging(false); if (saved) load(); }} />}
    </div>
  );
}

function CookLogForm({ recipeId, onClose }) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [adjustments, setAdjustments] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function save() {
    await addCookLog({ recipeId, dateMade: date, rating: rating || null, notes, adjustments, photos: [] });
    onClose(true);
  }

  return (
    <div onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,92vw)' }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>Log a cook</h3>
        <div style={{ fontSize: 28, margin: '0 0 10px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} onClick={() => setRating(n)} style={{ cursor: 'pointer', color: n <= rating ? 'var(--accent)' : 'var(--icon-inactive)' }}>★</span>
          ))}
        </div>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 8 }} />
        <textarea className="input" placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginBottom: 8, borderRadius: 12 }} />
        <textarea className="input" placeholder="Adjustments (e.g. doubled garlic)" rows={2} value={adjustments} onChange={(e) => setAdjustments(e.target.value)} style={{ marginBottom: 12, borderRadius: 12 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
