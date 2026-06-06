import { useState, useEffect } from 'react';
import { isFavorite, toggleFavorite } from '../state/store';
import { placeholderGradient } from '../lib/colorUtil';

export default function RecipeRow({ recipe, onOpen, onAdd, onDelete, delay = 0 }) {
  const [fav, setFav] = useState(false);
  useEffect(() => { isFavorite(recipe.id).then(setFav); }, [recipe.id]);

  const initial = (recipe.name || recipe.cuisine || '?').trim()[0]?.toUpperCase() || '?';
  const macros = (recipe.macroContributors || []).slice(0, 4);

  return (
    <div
      className="card liftable fade-in"
      style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 'var(--gap-row)', animationDelay: `${delay}ms`, padding: 12 }}
      onClick={() => onOpen?.(recipe)}
    >
      {/* Thumbnail — 80×80, rounded, gradient fallback */}
      <div style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0, overflow: 'hidden' }}>
        {recipe.image ? (
          <img src={recipe.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: placeholderGradient(recipe.name),
            display: 'grid', placeItems: 'center',
            color: '#fff', fontSize: 28, fontWeight: 700,
            letterSpacing: -1,
          }}>{initial}</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{recipe.name}</span>
          {recipe.source === 'imported'    && <span className="pill tag-sage">imported</span>}
          {recipe.source === 'spoonacular' && <span className="pill tag-terra">API</span>}
        </div>
        <div className="meta" style={{ marginBottom: 7 }}>
          {[recipe.cuisine, recipe.totalTimeMinutes && `${recipe.totalTimeMinutes} min`, recipe.difficulty]
            .filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {macros.map((m, i) => (
            <span key={m + i} className={`pill ${i % 2 ? 'tag-terra' : 'tag-sage'}`}>{m}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', paddingLeft: 4 }}>
        <button
          aria-label="favorite"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id, recipe).then(setFav); }}
          style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, color: fav ? 'var(--accent)' : 'var(--icon-inactive)' }}
        >{fav ? '♥' : '♡'}</button>
        <button
          aria-label="add to week"
          onClick={(e) => { e.stopPropagation(); onAdd?.(recipe); }}
          style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, color: 'var(--icon-inactive)' }}
        >+</button>
        {recipe.source === 'imported' && (
          <button
            aria-label="delete recipe"
            onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this recipe?')) onDelete?.(recipe.id); }}
            style={{ background: 'none', border: 'none', fontSize: 18, lineHeight: 1, color: 'var(--icon-inactive)' }}
          >🗑️</button>
        )}
      </div>
    </div>
  );
}
