import { useState } from 'react';
import { validateImport } from '../lib/validateImport';
import { saveRecipe, uid } from '../state/store';

// Import screen (Foundation). Paste an externally-generated AI recipe as JSON,
// validate against the §7 schema, then store it (source: "imported").
// Supports both single recipe and array of recipes.
export default function ImportScreen({ onImported }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [imported, setImported] = useState([]);

  async function check() {
    // Parse the input — could be a single recipe or an array
    let recipes = [];
    try {
      const parsed = JSON.parse(text);
      recipes = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      setResult({ ok: false, errors: ['Not valid JSON: ' + e.message], warnings: [], count: 0 });
      return;
    }

    // Validate and import all recipes
    const results = [];
    let errorCount = 0;
    for (const recipeData of recipes) {
      const r = validateImport(recipeData);
      results.push(r);
      if (r.ok) {
        const recipe = { id: uid('imp'), image: null, tip: '', ...r.recipe, source: 'imported', cachedAt: Date.now() };
        await saveRecipe(recipe);
        setImported(prev => [...prev, recipe]);
        onImported?.(recipe.id);
      } else {
        errorCount += r.errors.length;
      }
    }

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings || []);
    setResult({ ok: errorCount === 0, errors: allErrors, warnings: allWarnings, count: recipes.length, successCount: recipes.length - results.filter(r => !r.ok).length });
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Import recipes</h1>
      <p className="meta">Paste recipes as JSON (single recipe or array). Each must match the import schema.</p>
      <textarea className="input" rows={12} value={text} onChange={(e) => setText(e.target.value)}
        placeholder='[{ "name": "...", "source": "imported", ... }]' style={{ fontFamily: 'monospace', fontSize: 12, margin: '10px 0' }} />
      <button className="btn btn-primary" onClick={check}>Validate & import</button>

      {result && !result.ok && result.errors.length > 0 && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <strong style={{ color: 'var(--accent-dark)' }}>Validation failed — {result.errors.length} error(s)</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, maxHeight: 200, overflowY: 'auto' }}>
            {result.errors.slice(0, 10).map((e, i) => <li key={i} className="meta">{e}</li>)}
            {result.errors.length > 10 && <li className="meta">... and {result.errors.length - 10} more</li>}
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
                {result.warnings.length > 10 && <li className="meta">... and {result.warnings.length - 10} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
