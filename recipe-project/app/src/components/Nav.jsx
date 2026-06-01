// Bottom tab bar. Lightweight hand-rolled routing (no react-router dependency —
// see GAPS.md if deep-linking is wanted later).
const TABS = [
  { id: 'finder', label: 'Find', icon: '🔍' },
  { id: 'week', label: 'Week', icon: '🗓' },
  { id: 'shopping', label: 'Shop', icon: '🛒' },
  { id: 'favorites', label: 'Saved', icon: '♥' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function Nav({ active, onChange }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 1024, margin: '0 auto',
      display: 'flex', background: 'var(--bg-card)', borderTop: '1px solid var(--border-hairline)',
      boxShadow: '0 -3px 10px rgba(58,46,38,0.06)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            flex: 1, background: 'none', border: 'none', padding: '10px 0',
            color: active === t.id ? 'var(--accent)' : 'var(--text-secondary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 11,
          }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </nav>
  );
}
