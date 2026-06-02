import { useEffect, useState } from 'react';
import RecipeRow from '../components/RecipeRow';
import AddToWeek from '../components/AddToWeek';
import { listFavorites, deleteRecipe } from '../state/store';

export default function FavoritesScreen({ onOpen }) {
  const [recipes, setRecipes] = useState([]);
  const [addTarget, setAddTarget] = useState(null);

  const load = () => listFavorites().then(setRecipes);
  useEffect(() => { load(); }, []);

  const handleDelete = async (recipeId) => {
    try {
      await deleteRecipe(recipeId);
      await load();
    } catch (e) {
      console.error('Failed to delete recipe:', e);
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Saved recipes</h1>
      {recipes.length === 0 && <p className="meta">No favorites yet. Tap the heart on any recipe.</p>}
      {recipes.map((r, i) => (
        <RecipeRow key={r.id} recipe={r} delay={i * 30}
          onOpen={() => onOpen(r.id)} onAdd={(rec) => setAddTarget(rec)} onDelete={handleDelete} />
      ))}
      {addTarget && <AddToWeek recipe={addTarget} onClose={() => { setAddTarget(null); load(); }} />}
    </div>
  );
}
