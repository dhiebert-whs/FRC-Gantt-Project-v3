import { useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTeamStore } from './stores/teamStore';

function App() {
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadTeamDb = useTeamStore(s => s.loadTeamDb);
  const settingsLoaded = useSettingsStore(s => s.isLoaded);
  const teamLoaded = useTeamStore(s => s.isLoaded);

  useEffect(() => {
    loadSettings();
    loadTeamDb();
  }, []);

  if (!settingsLoaded || !teamLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <p className="text-lg tracking-wide">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="px-4 py-3 bg-gray-900 border-b border-gray-800 text-sm text-gray-400">
        FRC Gantt — Phase 1 complete. Phase 2 (App Shell) coming next.
      </header>
      <main className="flex-1 flex items-center justify-center text-gray-600">
        No project open.
      </main>
    </div>
  );
}

export default App;
