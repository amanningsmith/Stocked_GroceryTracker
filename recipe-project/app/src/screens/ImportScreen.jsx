import { useState } from 'react';
import { validateImport } from '../lib/validateImport';
import { saveRecipe, toggleFavorite, uid } from '../state/store';
import { generateRecipes } from '../api/anthropic';

// Import screen (Foundation). Two entry points feed the same validate-and-save pipeline:
//   1. Paste JSON manually (original path).
//   2. Generate with AI — prompt → Claude → JSON → validate → save.
export default function ImportScreen({ onImported }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [imported, setImported] = useState([]);

  // AI generate panel state
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Core validate-and-save logic. Accepts a parsed array of recipe objects.
  // Used by both the paste path and the AI generate path.
  async function importRecipes(recipes) {
    const results = [];
    let errorCount = 0;
    const nextImported = [];
    for (const recipeData of recipes) {
      const r = validateImport(recipeData);
      results.push(r);
      if (r.ok) {
        const recipe = { id: uid('imp'), image: null, tip: '', ...r.recipe, source: 'imported', cachedAt: Date.now() };
        await saveRecipe(recipe);
        await toggleFavorite(recipe.id, recipe);
        nextImported.push(recipe);
        setImported(prev => [...prev, recipe]);
        onImported?.(recipe.id);
      } else {
        errorCount += r.errors.length;
      }
    }
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings || []);
    setResult({
      ok: errorCount === 0,
      errors: allErrors,
      warnings: allWarnings,
      count: recipes.length,
      successCount: recipes.length - results.filter(r => !r.ok).length,
    });
    return nextImported;
  }

  // Manual paste path: parse the textarea, then validate-and-save.
  async function check() {
    let recipes = [];
    try {
      const parsed = JSON.parse(text);
      recipes = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      setResult({ ok: false, errors: ['Not valid JSON: ' + e.message], warnings: [], count: 0 });
      return;
    }
    await importRecipes(recipes);
  }

  // AI generate path: call Claude, populate textarea for transparency, then validate-and-save.
  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError('');
    setResult(null);
    try {
      const recipes = await generateRecipes(prompt.trim(), count);
      // Show the generated JSON in the textarea so the user can inspect/copy it.
      setText(JSON.stringify(recipes, null, 2));
      await importRecipes(recipes);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Import recipes</h1>

      {/* ── Generate with AI ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
          Generate with AI
        </p>
        <p className="meta" style={{ marginBottom: 10, lineHeight: 1.5 }}>
          Describe what you want — Claude generates ready-to-import recipes. Requires an Anthropic API key in Settings.
        </p>
        <textarea
          className="input"
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. weeknight chicken dinner under 30 min, no dairy"
          style={{ marginBottom: 10, resize: 'vertical' }}
        />

        {/* Count stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="meta">Recipes:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`chip${count === n ? ' active' : ''}`}
                style={{ minWidth: 32 }}
              >{n}</button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>

        {genError && (
          <div className="card" style={{ marginTop: 10, borderColor: 'var(--accent)', background: 'var(--accent-tint)' }}>
            <strong style={{ color: 'var(--accent-dark)', fontSize: 13 }}>Generation failed</strong>
            <p className="meta" style={{ marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{genError}</p>
          </div>
        )}
      </div>

      {/* ── Paste JSON ── */}
      <p className="meta" style={{ marginBottom: 6 }}>Or paste recipe JSON directly:</p>
      <textarea
        className="input"
        rows={10}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder='[{ "name": "...", "source": "imported", ... }]'
        style={{ fontFamily: 'monospace', fontSize: 12, margin: '0 0 10px' }}
      />
      <button className="btn btn-primary" onClick={check}>Validate & import</button>

      {/* ── Result ── */}
      {result && !result.ok && result.errors.length > 0 && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <strong style={{ color: 'var(--accent-dark)' }}>Validation failed — {result.errors.length} error(s)</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, maxHeight: 200, overflowY: 'auto' }}>
            {result.errors.slice(0, 10).map((e, i) => <li key={i} className="meta">{e}</li>)}
            {result.errors.length > 10 && <li className="meta">… and {result.errors.length - 10} more</li>}
          </ul>
        </div>
      )}
      {result?.ok && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--secondary-dark)' }}>✓ Imported {result.successCount} recipe{result.successCount !== 1 ? 's' : ''}.</p>
          {result.warnings?.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--border-chip)' }}>
              <strong className="meta">Imported with {result.warnings.length} note{result.warnings.length !== 1 ? 's' : ''}:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, maxHeight: 200, overflowY: 'auto' }}>
                {result.warnings.slice(0, 10).map((w, i) => <li key={i} className="meta">{w}</li>)}
                {result.warnings.length > 10 && <li className="meta">… and {result.warnings.length - 10} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
