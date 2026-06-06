import { useEffect, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { exportBackup, importBackup } from '../db/backup';
import { ensurePermission, checkPermission } from '../lib/thawReminders';

export default function SettingsScreen({ onGoImport, onGoPantry }) {
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [flash, setFlash] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [remindersOn, setRemindersOn] = useState(true);
  const [reminderHour, setReminderHour] = useState(20);
  const [permStatus, setPermStatus] = useState(''); // '', 'granted', 'denied'
  const avatarRef = useRef();
  const importFileRef = useRef();

  useEffect(() => {
    Preferences.get({ key: 'spoonacular_key' }).then(({ value }) => setApiKey(value || ''));
    Preferences.get({ key: 'user_name' }).then(({ value }) => setName(value || ''));
    Preferences.get({ key: 'user_email' }).then(({ value }) => setEmail(value || ''));
    Preferences.get({ key: 'user_avatar' }).then(({ value }) => setAvatar(value || null));
    Preferences.get({ key: 'reminders_on' }).then(({ value }) => setRemindersOn(value !== 'false'));
    Preferences.get({ key: 'reminder_hour' }).then(({ value }) => setReminderHour(value ? parseInt(value, 10) : 20));
    checkPermission().then(granted => setPermStatus(granted ? 'granted' : ''));
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

  async function toggleReminders(on) {
    setRemindersOn(on);
    await Preferences.set({ key: 'reminders_on', value: String(on) });
  }

  async function saveReminderHour(h) {
    const n = Math.max(0, Math.min(23, h));
    setReminderHour(n);
    await Preferences.set({ key: 'reminder_hour', value: String(n) });
  }

  async function requestPermission() {
    const granted = await ensurePermission();
    setPermStatus(granted ? 'granted' : 'denied');
  }

  async function handleExport() {
    try {
      setBackupStatus('Exporting…');
      await exportBackup();
      setBackupStatus('Export done ✓');
    } catch (err) {
      setBackupStatus('Export failed: ' + err.message);
    }
    setTimeout(() => setBackupStatus(''), 3000);
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setBackupStatus('Importing…');
      const text = await file.text();
      await importBackup(text);
      setBackupStatus('Import done ✓ — restart the app to see your data');
    } catch (err) {
      setBackupStatus('Import failed: ' + err.message);
    }
    e.target.value = '';
    setTimeout(() => setBackupStatus(''), 5000);
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

      {/* ── Reminders ── */}
      <SectionLabel>Reminders</SectionLabel>
      <div className="card" style={{ marginBottom: 16, padding: '0 var(--pad-card)' }}>
        {/* Master toggle */}
        <div className="settings-row" style={{ cursor: 'default' }}>
          <span>Thaw reminders</span>
          <button
            onClick={() => toggleReminders(!remindersOn)}
            style={{
              background: remindersOn ? 'var(--accent)' : 'var(--border-hairline)',
              border: 'none', borderRadius: 12, width: 44, height: 24,
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
            aria-label={remindersOn ? 'Disable thaw reminders' : 'Enable thaw reminders'}
          >
            <span style={{
              display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: remindersOn ? 23 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Reminder time */}
        <div className="settings-row" style={{ cursor: 'default', opacity: remindersOn ? 1 : 0.4 }}>
          <span>Reminder time</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => remindersOn && saveReminderHour(reminderHour - 1)}
              style={{ background: 'none', border: '1px solid var(--border-hairline)', borderRadius: 4, width: 24, height: 24, cursor: remindersOn ? 'pointer' : 'default', fontSize: 16 }}>−</button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {String(reminderHour).padStart(2, '0')}:00
            </span>
            <button
              onClick={() => remindersOn && saveReminderHour(reminderHour + 1)}
              style={{ background: 'none', border: '1px solid var(--border-hairline)', borderRadius: 4, width: 24, height: 24, cursor: remindersOn ? 'pointer' : 'default', fontSize: 16 }}>+</button>
          </div>
        </div>

        {/* Permission grant */}
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-hairline)' }}>
          {permStatus === 'granted' ? (
            <p className="meta" style={{ margin: 0, color: 'var(--secondary-dark)' }}>Notification permission granted ✓</p>
          ) : (
            <>
              {permStatus === 'denied' && (
                <p className="meta" style={{ marginBottom: 8, color: 'var(--accent-dark)' }}>Permission denied — open device Settings to re-enable notifications for this app.</p>
              )}
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={requestPermission}>
                Grant notification permission
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Data backup ── */}
      <SectionLabel>Data</SectionLabel>
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="meta" style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Export saves all your recipes, weeks, meals, pantry, and shopping data to a file.
          Import loads that file on any device.
        </p>
        {backupStatus && (
          <div style={{ background: 'var(--secondary-tint)', color: 'var(--secondary-dark)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
            {backupStatus}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExport}>
            Export backup
          </button>
          <button className="btn" style={{ flex: 1, background: 'var(--bg-page)', border: '1.5px solid var(--border-hairline)' }} onClick={() => importFileRef.current.click()}>
            Import backup
          </button>
        </div>
        <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportFile} />
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
