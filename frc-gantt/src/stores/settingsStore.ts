// ============================================================
// FRC Gantt App — Settings Store
// src/stores/settingsStore.ts
// ============================================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, RecentProject, GanttPreferences } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { useToastStore } from './toastStore';

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  addRecentProject: (entry: RecentProject) => void;
  updateGanttPrefs: (prefs: Partial<GanttPreferences>) => void;
  updateSettings: (changes: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoaded: false,

  loadSettings: async () => {
    try {
      const json = await invoke<string>('read_settings');
      if (json) {
        const loaded = JSON.parse(json) as AppSettings;
        // Merge with defaults so new fields added in future versions are present
        set({
          settings: { ...DEFAULT_SETTINGS, ...loaded, gantt: { ...DEFAULT_SETTINGS.gantt, ...loaded.gantt } },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      useToastStore.getState().addToast(
        'Settings file could not be read. Using defaults.',
        'warning',
      );
      set({ isLoaded: true });
    }
  },

  saveSettings: async () => {
    const updated = { ...get().settings, updatedAt: new Date().toISOString() };
    set({ settings: updated });
    try {
      await invoke('write_settings', { json: JSON.stringify(updated, null, 2) });
    } catch (e) {
      console.error('Failed to save settings:', e);
      useToastStore.getState().addToast('Failed to save settings.', 'warning');
    }
  },

  addRecentProject: (entry) => {
    const { settings } = get();
    // Deduplicate by path, keep newest at front, cap at 10
    const filtered = settings.recentProjects.filter(r => r.filePath !== entry.filePath);
    set({ settings: { ...settings, recentProjects: [entry, ...filtered].slice(0, 10) } });
    get().saveSettings();
  },

  updateGanttPrefs: (prefs) => {
    const { settings } = get();
    set({ settings: { ...settings, gantt: { ...settings.gantt, ...prefs } } });
    get().saveSettings();
  },

  updateSettings: (changes) => {
    set({ settings: { ...get().settings, ...changes } });
    get().saveSettings();
  },
}));
