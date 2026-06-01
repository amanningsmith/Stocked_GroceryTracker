import { useEffect, useState } from 'react';
import { getRecipeById, logsForRecipe, addCookLog, toggleFavorite, isFavorite } from '../state/store';
import AddToWeek from '../components/AddToWeek';

// Recipe detail (MVP1 full recipe) + cooking-history block (MVP4).
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
    <div className="screen">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>

      {recipe.image && <img src={recipe.image} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24 }}>{recipe.name}</h1>
        <button onClick={() => toggleFavorite(recipe.id).then(setFav)}
          style={{ background: 'none', border: 'none', fontSize: 26, color: fav ? 'var(--accent)' : 'var(--icon-inactive)' }}>
          {fav ? '♥' : '♡'}</button>
      </div>
      <p className="meta">
        {[recipe.cuisine, recipe.totalTimeMinutes && `${recipe.totalTimeMinutes} min`, recipe.difficulty,
          `serves ${recipe.servings}`].filter(Boolean).join(' · ')}
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button className="btn btn-primary" onClick={() => onCook(recipe.id)}>Cook this</button>
        <button className="btn btn-secondary" onClick={() => setAddTarget(recipe)}>Add to week</button>
      </div>

      {/* History block — surfaces in detail per MVP4 */}
      <div className="card" style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16 }}>Cooking history</h3>
          {avg && <span className="pill tag-terra">★ {avg} avg · {logs.length} made</span>}
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

      <h3 style={{ fontSize: 16, margin: '12px 0 6px' }}>Ingredients</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {(recipe.ingredients || []).map((i, k) => (
          <li key={k} style={{ marginBottom: 3 }}>
            {i.amount ? `${i.amount} ${i.unit || ''} ` : ''}{i.name}
            {i.isStaple && <span className="pill tag-sage" style={{ marginLeft: 6 }}>staple</span>}
          </li>
        ))}
      </ul>

      <h3 style={{ fontSize: 16, margin: '14px 0 6px' }}>Steps</h3>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {(recipe.steps || []).map((s) => <li key={s.number} style={{ marginBottom: 8 }}>{s.instruction}</li>)}
      </ol>

      {recipe.tip && (
        <div className="card" style={{ marginTop: 14, background: 'var(--secondary-tint)', borderColor: 'var(--secondary-tint)' }}>
          <strong style={{ color: 'var(--secondary-dark)' }}>Tip </strong>
          <span style={{ color: 'var(--secondary-dark)' }}>{recipe.tip}</span>
        </div>
      )}

      {addTarget && <AddToWeek recipe={addTarget} onClose={() => setAddTarget(null)} />}
      {logging && <CookLogForm recipeId={recipe.id} onClose={(saved) => { setLogging(false); if (saved) load(); }} />}
    </div>
  );
}

// Minimal cook-log entry (MVP4): rating, notes, adjustments, date.
// Photo capture is stubbed — see GAPS.md (needs @capacitor/camera + file storage).
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
    <div onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(58,46,38,0.35)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,92vw)' }}>
        <h3 style={{ fontSize: 18 }}>Log a cook</h3>
        <div style={{ fontSize: 26, margin: '6px 0' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} onClick={() => setRating(n)} style={{ cursor: 'pointer', color: n <= rating ? 'var(--accent)' : 'var(--icon-inactive)' }}>★</span>
          ))}
        </div>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 8 }} />
        <textarea className="input" placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginBottom: 8 }} />
        <textarea className="input" placeholder="Adjustments (e.g. doubled garlic)" rows={2} value={adjustments} onChange={(e) => setAdjustments(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
