import { useEffect, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

export default function SettingsScreen({ onGoImport, onGoPantry }) {
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [flash, setFlash] = useState('');
  const avatarRef = useRef();

  useEffect(() => {
    Preferences.get({ key: 'spoonacular_key' }).then(({ value }) => setApiKey(value || ''));
    Preferences.get({ key: 'user_name' }).then(({ value }) => setName(value || ''));
    Preferences.get({ key: 'user_email' }).then(({ value }) => setEmail(value || ''));
    Preferences.get({ key: 'user_avatar' }).then(({ value }) => setAvatar(value || null));
  }, []);

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 1800);
  }

  async function saveProfile() {
    await Preferences.set({ key: 'user_name', value: name.trim() });
    await Preferences.set({ key: 'user_email', value: email.trim() });
    showFlash('Profile saved ✓');
  }

  async function saveKey() {
    await Preferences.set({ key: 'spoonacular_key', value: apiKey.trim() });
    showFlash('API key saved ✓');
  }

  function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result;
      setAvatar(b64);
      await Preferences.set({ key: 'user_avatar', value: b64 });
    };
    reader.readAsDataURL(file);
  }

  const initial = (name || 'You').trim()[0].toUpperCase();

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      {flash && (
        <div style={{ background: 'var(--secondary-tint)', color: 'var(--secondary-dark)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          {flash}
        </div>
      )}

      {/* ── Profile ── */}
      <SectionLabel>Your profile</SectionLabel>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Avatar tap-to-change */}
          <button onClick={() => avatarRef.current.click()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid var(--border-hairline)',
              background: avatar ? 'transparent' : 'var(--accent-tint)',
              display: 'grid', placeItems: 'center',
            }}>
              {avatar ? (
                <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--accent-dark)' }}>{initial}</span>
              )}
            </div>
            <span style={{ display: 'block', textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Change</span>
          </button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveProfile}>Save profile</button>
      </div>

      {/* ── Spoonacular API ── */}
      <SectionLabel>Spoonacular API</SectionLabel>
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="meta" style={{ marginBottom: 10, lineHeight: 1.5 }}>
          Free tier allows ~7 calls/day. The app auto-searches once per day on open and caches results.
        </p>
        <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder="Paste your API key" style={{ marginBottom: 10 }} />
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveKey}>Save key</button>
      </div>

      {/* ── App ── */}
      <SectionLabel>App</SectionLabel>
      <div className="card" style={{ marginBottom: 16, padding: '0 var(--pad-card)' }}>
        <button className="settings-row" onClick={onGoImport}>
          <span>Import recipes</span>
          <span style={{ color: 'var(--text-hint)' }}>→</span>
        </button>
        <button className="settings-row" onClick={onGoPantry}>
          <span>Pantry</span>
          <span style={{ color: 'var(--text-hint)' }}>→</span>
        </button>
      </div>

      <p className="meta" style={{ marginTop: 8, textAlign: 'center' }}>Units: imperial · Theme: warm cream</p>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
      {children}
    </div>
  );
}
