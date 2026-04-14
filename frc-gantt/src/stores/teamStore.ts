// ============================================================
// FRC Gantt App — Team Store
// src/stores/teamStore.ts
// ============================================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';
import type { TeamDatabase, TeamMember, Subteam, Skill } from '../types';
import { useToastStore } from './toastStore';

const EMPTY_TEAM_DB: TeamDatabase = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  subteams: [],
  skills: [],
  members: [],
};

interface TeamState {
  db: TeamDatabase;
  isLoaded: boolean;
}

interface TeamActions {
  loadTeamDb: () => Promise<void>;
  saveTeamDb: () => Promise<void>;
  // Members
  addMember: (member: Omit<TeamMember, 'id'>) => void;
  updateMember: (id: string, changes: Partial<TeamMember>) => void;
  archiveMember: (id: string) => void;
  // Subteams
  addSubteam: (subteam: Omit<Subteam, 'id'>) => void;
  updateSubteam: (id: string, changes: Partial<Subteam>) => void;
  deleteSubteam: (id: string) => void;
  // Skills
  addSkill: (skill: Omit<Skill, 'id'>) => void;
  updateSkill: (id: string, changes: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
}

export const useTeamStore = create<TeamState & TeamActions>((set, get) => ({
  db: { ...EMPTY_TEAM_DB },
  isLoaded: false,

  loadTeamDb: async () => {
    try {
      const json = await invoke<string>('read_team_db');
      if (json) {
        set({ db: JSON.parse(json) as TeamDatabase, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load team database:', e);
      useToastStore.getState().addToast(
        'Team database could not be read. Starting with empty roster.',
        'warning',
      );
      set({ isLoaded: true });
    }
  },

  saveTeamDb: async () => {
    const db = { ...get().db, updatedAt: new Date().toISOString() };
    set({ db });
    try {
      await invoke('write_team_db', { json: JSON.stringify(db, null, 2) });
    } catch (e) {
      console.error('Failed to save team database:', e);
      useToastStore.getState().addToast('Failed to save team database.', 'warning');
    }
  },

  addMember: (member) => {
    const db = get().db;
    set({ db: { ...db, members: [...db.members, { id: nanoid(), ...member }] } });
    get().saveTeamDb();
  },

  updateMember: (id, changes) => {
    const db = get().db;
    set({ db: { ...db, members: db.members.map(m => m.id === id ? { ...m, ...changes } : m) } });
    get().saveTeamDb();
  },

  archiveMember: (id) => {
    get().updateMember(id, { isActive: false });
  },

  addSubteam: (subteam) => {
    const db = get().db;
    set({ db: { ...db, subteams: [...db.subteams, { id: nanoid(), ...subteam }] } });
    get().saveTeamDb();
  },

  updateSubteam: (id, changes) => {
    const db = get().db;
    set({ db: { ...db, subteams: db.subteams.map(s => s.id === id ? { ...s, ...changes } : s) } });
    get().saveTeamDb();
  },

  deleteSubteam: (id) => {
    const db = get().db;
    set({ db: { ...db, subteams: db.subteams.filter(s => s.id !== id) } });
    get().saveTeamDb();
  },

  addSkill: (skill) => {
    const db = get().db;
    set({ db: { ...db, skills: [...db.skills, { id: nanoid(), ...skill }] } });
    get().saveTeamDb();
  },

  updateSkill: (id, changes) => {
    const db = get().db;
    set({ db: { ...db, skills: db.skills.map(s => s.id === id ? { ...s, ...changes } : s) } });
    get().saveTeamDb();
  },

  deleteSkill: (id) => {
    const db = get().db;
    set({ db: { ...db, skills: db.skills.filter(s => s.id !== id) } });
    get().saveTeamDb();
  },
}));
