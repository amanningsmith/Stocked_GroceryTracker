import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import FinderScreen from './screens/FinderScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import WeekScreen from './screens/WeekScreen';
import ShoppingScreen from './screens/ShoppingScreen';
import CookingScreen from './screens/CookingScreen';
import ImportScreen from './screens/ImportScreen';
import SettingsScreen from './screens/SettingsScreen';
import PantryScreen from './screens/PantryScreen';
import { initDb } from './db/db';

// Lightweight view state instead of a router dependency (see GAPS.md).
// `view` is one of the tabs or a detail/cooking/import/pantry overlay screen.
export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('finder');
  const [view, setView] = useState({ name: 'tab' });

  useEffect(() => { initDb().then(() => setReady(true)).catch((e) => { console.error(e); setReady(true); }); }, []);

  if (!ready) return <div className="app"><div className="screen"><p className="meta">Starting…</p></div></div>;

  const openRecipe = (id) => setView({ name: 'detail', id });
  const openCooking = (id) => setView({ name: 'cooking', id });
  const backToTab = () => setView({ name: 'tab' });

  let screen;
  if (view.name === 'detail') {
    screen = <RecipeDetailScreen recipeId={view.id} onBack={backToTab} onCook={openCooking} />;
  } else if (view.name === 'cooking') {
    screen = <CookingScreen recipeId={view.id} onExit={backToTab} />;
  } else if (view.name === 'import') {
    screen = <ImportScreen onImported={openRecipe} />;
  } else if (view.name === 'pantry') {
    screen = <PantryScreen />;
  } else {
    switch (tab) {
      case 'finder': screen = <FinderScreen onOpen={openRecipe} />; break;
      case 'favorites': screen = <FavoritesScreen onOpen={openRecipe} />; break;
      case 'week': screen = <WeekScreen onOpen={openRecipe} />; break;
      case 'shopping': screen = <ShoppingScreen />; break;
      case 'settings': screen = <SettingsScreen onGoImport={() => setView({ name: 'import' })} onGoPantry={() => setView({ name: 'pantry' })} />; break;
      default: screen = <FinderScreen onOpen={openRecipe} />;
    }
  }

  return (
    <div className="app">
      {screen}
      {/* Tab bar hidden inside the full-screen cooking view */}
      {view.name !== 'cooking' && (
        <Nav active={view.name === 'tab' ? tab : ''} onChange={(t) => { setTab(t); setView({ name: 'tab' }); }} />
      )}
    </div>
  );
}
