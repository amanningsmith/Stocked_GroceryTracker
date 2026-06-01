import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

// Settings (spec §2): Spoonacular API key lives here (Preferences, not SQLite).
export default function SettingsScreen({ onGoImport, onGoPantry }) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { Preferences.get({ key: 'spoonacular_key' }).then(({ value }) => setKey(value || '')); }, []);

  async function save() {
    await Preferences.set({ key: 'spoonacular_key', value: key.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Spoonacular API key</h3>
        <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your key" style={{ marginBottom: 10 }} />
        <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button>
      </div>

      <div className="card" style={{ marginBottom: 10 }} onClick={onGoImport}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span>Import a recipe</span><span className="muted">→</span>
        </div>
      </div>
      <div className="card" onClick={onGoPantry}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span>Pantry</span><span className="muted">→</span>
        </div>
      </div>

      <p className="meta" style={{ marginTop: 16 }}>Units: imperial · Theme: cream (fixed)</p>
    </div>
  );
}
