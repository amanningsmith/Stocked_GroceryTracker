import { useState } from 'react';
import { validateImport } from '../lib/validateImport';
import { saveRecipe, uid } from '../state/store';

// Import screen (Foundation). Paste an externally-generated AI recipe as JSON,
// validate against the §7 schema, then store it (source: "imported").
export default function ImportScreen({ onImported }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  async function check() {
    const r = validateImport(text);
    setResult(r);
    if (r.ok) {
      const recipe = { id: uid('imp'), image: null, tip: '', ...r.recipe, source: 'imported', cachedAt: Date.now() };
      await saveRecipe(recipe);
      onImported?.(recipe.id);
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Import recipe</h1>
      <p className="meta">Paste a recipe generated elsewhere (JSON matching the import schema).</p>
      <textarea className="input" rows={12} value={text} onChange={(e) => setText(e.target.value)}
        placeholder='{ "name": "...", "source": "imported", ... }' style={{ fontFamily: 'monospace', fontSize: 12, margin: '10px 0' }} />
      <button className="btn btn-primary" onClick={check}>Validate & import</button>

      {result && !result.ok && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <strong style={{ color: 'var(--accent-dark)' }}>Validation failed</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {result.errors.map((e, i) => <li key={i} className="meta">{e}</li>)}
          </ul>
        </div>
      )}
      {result?.ok && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--secondary-dark)' }}>✓ Imported.</p>
          {result.warnings?.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--border-chip)' }}>
              <strong className="meta">Imported with notes:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {result.warnings.map((w, i) => <li key={i} className="meta">{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
