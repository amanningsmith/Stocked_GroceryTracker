import { useEffect, useRef, useState } from 'react';
import { getRecipeById } from '../state/store';

// Interactive cooking screen (MVP6). Full ingredient list always visible;
// selecting a step highlights the ingredients used in that step. Manual timers
// per step. Screen stays awake via the Wake Lock API (Capacitor WebView supports it).
export default function CookingScreen({ recipeId, onExit }) {
  const [recipe, setRecipe] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const wakeRef = useRef(null);

  useEffect(() => { getRecipeById(recipeId).then(setRecipe); }, [recipeId]);

  // Keep the screen awake while cooking; release on unmount.
  useEffect(() => {
    let released = false;
    (async () => {
      try { wakeRef.current = await navigator.wakeLock?.request('screen'); } catch { /* unsupported */ }
    })();
    return () => { released = true; wakeRef.current?.release?.().catch(() => {}); };
  }, []);

  if (!recipe) return <div className="screen"><p className="meta">Loading…</p></div>;
  const steps = recipe.steps || [];
  const step = steps[stepIdx];
  const activeRefs = new Set((step?.ingredientRefs || []).map((n) => n.trim().toLowerCase()));

  // Imported recipes guarantee ingredientRefs match names exactly (validated on
  // import), so exact case-insensitive membership is correct and avoids false
  // positives like "salt" lighting up "salted butter". Spoonacular refs are
  // normalized the same way and match in the common case.
  const isUsed = (name) => activeRefs.has(name.trim().toLowerCase());

  return (
    <div className="screen" style={{ paddingBottom: 16 }}>
      <div className="row-flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ fontSize: 20 }}>{recipe.name}</h1>
        <button className="btn btn-secondary" onClick={onExit}>Done</button>
      </div>

      {/* Ingredients always visible; current step's ingredients highlighted. */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Ingredients</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(recipe.ingredients || []).map((i, k) => (
            <span key={k} className="pill" style={{
              fontSize: 13, padding: '5px 10px',
              background: isUsed(i.name) ? 'var(--accent-tint)' : 'var(--bg-page)',
              color: isUsed(i.name) ? 'var(--accent-dark)' : 'var(--text-secondary)',
              border: '1px solid var(--border-hairline)',
              transition: 'background 0.18s ease',
            }}>
              {i.amount ? `${i.amount} ${i.unit || ''} ` : ''}{i.name}
            </span>
          ))}
        </div>
      </div>

      {/* Current step with horizontal-slide feel on change */}
      <div className="card fade-in" key={stepIdx} style={{ minHeight: 140, marginBottom: 14 }}>
        <div className="meta" style={{ marginBottom: 6 }}>Step {stepIdx + 1} of {steps.length}</div>
        <p style={{ fontSize: 18, lineHeight: 1.4 }}>{step?.instruction}</p>
        <Timer />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} disabled={stepIdx === 0}
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}>← Prev</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={stepIdx >= steps.length - 1}
          onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}>Next →</button>
      </div>
    </div>
  );
}

// Manual per-step timer (spec MVP6: timers are manual, tag/start per step).
function Timer() {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running) ref.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="row-flex" style={{ marginTop: 12, gap: 8 }}>
      <span className="pill tag-sage" style={{ fontSize: 15, padding: '6px 12px' }}>⏱ {mm}:{ss}</span>
      <button className="chip" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</button>
      <button className="chip" onClick={() => { setRunning(false); setSecs(0); }}>Reset</button>
    </div>
  );
}
