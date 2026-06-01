import { useState, useEffect } from 'react';
import { isFavorite, toggleFavorite } from '../state/store';

// Compact, defined row-card (style guide: Recipe row, MVP1).
// 54px thumb (or cuisine-initial tile for imported/no-photo), Fraunces name,
// meta line, macro-contributor pills, favorite + add-to-week on the right rail.
export default function RecipeRow({ recipe, onOpen, onAdd, delay = 0 }) {
  const [fav, setFav] = useState(false);
  useEffect(() => { isFavorite(recipe.id).then(setFav); }, [recipe.id]);

  const initial = (recipe.cuisine || recipe.name || '?').trim()[0]?.toUpperCase() || '?';
  const macros = (recipe.macroContributors || []).slice(0, 4);

  return (
    <div
      className="card liftable fade-in"
      style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 'var(--gap-row)', animationDelay: `${delay}ms` }}
      onClick={() => onOpen?.(recipe)}
    >
      {recipe.image ? (
        <img src={recipe.image} alt="" width={54} height={54}
          style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 54, height: 54, borderRadius: 10, flexShrink: 0,
          background: 'var(--bg-page)', border: '1px solid var(--border-hairline)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontSize: 22,
        }}>{initial}</div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{recipe.name}</span>
          {recipe.source === 'imported' && <span className="pill tag-sage">imported</span>}
        </div>
        <div className="meta" style={{ margin: '2px 0 6px' }}>
          {[recipe.cuisine, recipe.totalTimeMinutes && `${recipe.totalTimeMinutes} min`, recipe.difficulty]
            .filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {macros.map((m, i) => (
            <span key={m + i} className={`pill ${i % 2 ? 'tag-terra' : 'tag-sage'}`}>{m}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          aria-label="favorite"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id).then(setFav); }}
          style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, color: fav ? 'var(--accent)' : 'var(--icon-inactive)' }}
        >{fav ? '♥' : '♡'}</button>
        <button
          aria-label="add to week"
          onClick={(e) => { e.stopPropagation(); onAdd?.(recipe); }}
          style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, color: 'var(--icon-inactive)' }}
        >+</button>
      </div>
    </div>
  );
}
