// ============================================================
// FRC Gantt App — Team Panel (Phase 5)
// src/components/TeamPanel/index.tsx
//
// Three-tab panel: Members | Subteams | Skills
// Members: list with filter/search + MemberForm slide-in
// Subteams: add/edit/delete with color swatch
// Skills: add/edit/delete with subteam badge
// ============================================================

import { useState } from 'react';
import { useTeamStore } from '../../stores/teamStore';
import { MemberForm } from './MemberForm';

type Tab = 'members' | 'subteams' | 'skills';
type MemberFilter = 'active' | 'alumni' | 'all';

export function TeamPanel() {
  const [tab, setTab] = useState<Tab>('members');
  const [memberFormId, setMemberFormId] = useState<string | 'new' | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-800 px-4 shrink-0 pt-2 gap-1">
        {(['members', 'subteams', 'skills'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm kiosk:text-base font-medium capitalize rounded-t transition-colors ${
              tab === t
                ? 'text-white border-b-2 border-blue-500 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {tab === 'members'  && <MembersTab  openForm={id => setMemberFormId(id)} />}
          {tab === 'subteams' && <SubteamsTab />}
          {tab === 'skills'   && <SkillsTab   />}
        </div>

        {/* MemberForm slide-in */}
        {memberFormId !== null && (
          <MemberForm
            memberId={memberFormId === 'new' ? undefined : memberFormId}
            onClose={() => setMemberFormId(null)}
          />
        )}
      </div>

    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────

function MembersTab({ openForm }: { openForm: (id: string | 'new') => void }) {
  const db = useTeamStore(s => s.db);
  const [filter, setFilter] = useState<MemberFilter>('active');
  const [search,  setSearch]  = useState('');

  const filtered = db.members.filter(m => {
    if (filter === 'active' && !m.isActive)  return false;
    if (filter === 'alumni' &&  m.isActive)  return false;
    const q = search.toLowerCase();
    if (q && !`${m.firstName} ${m.lastName}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const activeCount = db.members.filter(m => m.isActive).length;
  const alumniCount = db.members.filter(m => !m.isActive).length;

  return (
    <div className="flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 kiosk:py-4 border-b border-gray-800 shrink-0 flex-wrap">

        {/* Filter pills */}
        <div className="flex gap-1">
          {(['active', 'alumni', 'all'] as MemberFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs kiosk:text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {f === 'active' ? `Active (${activeCount})` :
               f === 'alumni' ? `Alumni (${alumniCount})` : 'All'}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-1.5 kiosk:py-2 rounded bg-gray-800 border border-gray-700 text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />

        {/* Add */}
        <button
          onClick={() => openForm('new')}
          className="px-3 py-1.5 kiosk:py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm kiosk:text-base font-medium transition-colors whitespace-nowrap"
        >
          + Add Member
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm kiosk:text-base">
          {db.members.length === 0
            ? 'No members yet. Click + Add Member to get started.'
            : 'No members match the current filter.'}
        </div>
      ) : (
        <table className="w-full text-sm kiosk:text-base">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="text-gray-500 text-xs kiosk:text-sm uppercase tracking-wide">
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Role / Grade</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Subteams</th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Skills</th>
              <th className="text-left px-4 py-2 font-medium hidden xl:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const subteams = db.subteams.filter(s => m.subteamIds.includes(s.id));
              const skills   = db.skills.filter(s => m.skillIds.includes(s.id));
              const gradeLabel = m.isMentor ? 'Mentor' : m.grade ? `Grade ${m.grade}` : 'Student';

              return (
                <tr
                  key={m.id}
                  onClick={() => openForm(m.id)}
                  className="border-t border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 kiosk:py-3">
                    <span className="text-white font-medium">{m.firstName} {m.lastName}</span>
                    {!m.isActive && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                        Alumni
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 kiosk:py-3 text-gray-400 hidden sm:table-cell">
                    {gradeLabel}
                  </td>
                  <td className="px-4 py-2.5 kiosk:py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {subteams.map(s => (
                        <span
                          key={s.id}
                          className="px-1.5 py-0.5 rounded text-xs text-white font-medium"
                          style={{ backgroundColor: s.color }}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 kiosk:py-3 text-gray-400 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map(s => (
                        <span key={s.id} className="px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-300">
                          {s.name}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="text-xs text-gray-600">+{skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 kiosk:py-3 text-gray-500 text-xs hidden xl:table-cell">
                    {m.joinDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-gray-800 text-xs kiosk:text-sm text-gray-600 shrink-0">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
        {filter !== 'all' && ` (${filter})`}
      </div>
    </div>
  );
}

// ── Subteams Tab ──────────────────────────────────────────────

interface SubteamFormState {
  id: string | null;   // null = add mode
  name: string;
  color: string;
  description: string;
}

const PRESET_COLORS = [
  '#E63946', '#F4A261', '#E9C46A', '#2A9D8F',
  '#457B9D', '#8338EC', '#06D6A0', '#FB8500',
  '#FF6B9D', '#C77DFF', '#48CAE4', '#52B788',
];

function SubteamsTab() {
  const db           = useTeamStore(s => s.db);
  const addSubteam   = useTeamStore(s => s.addSubteam);
  const updateSubteam = useTeamStore(s => s.updateSubteam);
  const deleteSubteam = useTeamStore(s => s.deleteSubteam);
  const members      = db.members;

  const [form, setForm] = useState<SubteamFormState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openAdd() {
    setForm({ id: null, name: '', color: PRESET_COLORS[db.subteams.length % PRESET_COLORS.length], description: '' });
    setErrors({});
    setConfirmDeleteId(null);
  }

  function openEdit(id: string) {
    const st = db.subteams.find(s => s.id === id);
    if (!st) return;
    setForm({ id, name: st.name, color: st.color, description: st.description ?? '' });
    setErrors({});
    setConfirmDeleteId(null);
  }

  function cancelForm() {
    setForm(null);
    setErrors({});
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form?.name.trim()) e.name = 'Required.';
    if (!form?.color)       e.color = 'Required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function saveForm() {
    if (!form || !validateForm()) return;
    const data = { name: form.name.trim(), color: form.color, description: form.description.trim() || undefined };
    if (form.id) {
      updateSubteam(form.id, data);
    } else {
      addSubteam(data);
    }
    setForm(null);
  }

  function confirmDelete(id: string) {
    deleteSubteam(id);
    setConfirmDeleteId(null);
    if (form?.id === id) setForm(null);
  }

  return (
    <div className="p-4 space-y-3">

      {/* List */}
      {db.subteams.length === 0 && !form && (
        <p className="text-sm kiosk:text-base text-gray-500 italic py-4 text-center">
          No subteams yet.
        </p>
      )}

      {db.subteams.map(st => {
        const memberCount = members.filter(m => m.isActive && m.subteamIds.includes(st.id)).length;
        const isEditing   = form?.id === st.id;
        const isConfirming = confirmDeleteId === st.id;

        return (
          <div key={st.id} className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
            {/* Row */}
            <div className="flex items-center gap-3 px-4 py-3 kiosk:py-3.5">
              {/* Color swatch */}
              <div
                className="w-4 h-4 kiosk:w-5 kiosk:h-5 rounded-full shrink-0"
                style={{ backgroundColor: st.color }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium text-sm kiosk:text-base">{st.name}</span>
                {st.description && (
                  <span className="ml-2 text-xs kiosk:text-sm text-gray-500">{st.description}</span>
                )}
              </div>
              <span className="text-xs kiosk:text-sm text-gray-500 shrink-0">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
              {!isEditing && (
                <>
                  <button
                    onClick={() => openEdit(st.id)}
                    className="text-xs kiosk:text-sm text-gray-500 hover:text-white px-2 py-1 transition-colors"
                  >
                    Edit
                  </button>
                  {isConfirming ? (
                    <span className="flex items-center gap-1">
                      <span className="text-xs kiosk:text-sm text-gray-400">Delete?</span>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 text-gray-500 hover:text-white transition-colors">No</button>
                      <button onClick={() => confirmDelete(st.id)} className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors">Yes</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(st.id)}
                      className="text-xs kiosk:text-sm text-gray-600 hover:text-red-400 px-1 py-1 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Inline edit form */}
            {isEditing && form && (
              <SubteamForm
                form={form}
                errors={errors}
                onChange={patch => setForm(prev => prev ? { ...prev, ...patch } : prev)}
                onSave={saveForm}
                onCancel={cancelForm}
              />
            )}
          </div>
        );
      })}

      {/* Add form */}
      {form && form.id === null && (
        <div className="rounded-lg border border-blue-700 bg-gray-900 overflow-hidden">
          <SubteamForm
            form={form}
            errors={errors}
            onChange={patch => setForm(prev => prev ? { ...prev, ...patch } : prev)}
            onSave={saveForm}
            onCancel={cancelForm}
          />
        </div>
      )}

      {/* Add button */}
      {!form && (
        <button
          onClick={openAdd}
          className="w-full py-2 kiosk:py-3 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 text-sm kiosk:text-base transition-colors"
        >
          + Add Subteam
        </button>
      )}
    </div>
  );
}

function SubteamForm({
  form,
  errors,
  onChange,
  onSave,
  onCancel,
}: {
  form: SubteamFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<SubteamFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs kiosk:text-sm text-gray-400 block">Name *</label>
          <input
            type="text"
            autoFocus
            value={form.name}
            onChange={e => onChange({ name: e.target.value })}
            className={stInput(errors.name)}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs kiosk:text-sm text-gray-400 block">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={e => onChange({ description: e.target.value })}
            className={stInput()}
          />
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-1.5">
        <label className="text-xs kiosk:text-sm text-gray-400 block">Color *</label>
        <div className="flex flex-wrap gap-2 items-center">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ color: c })}
              className={`w-6 h-6 kiosk:w-7 kiosk:h-7 rounded-full transition-transform ${
                form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Custom hex input */}
          <input
            type="color"
            value={form.color}
            onChange={e => onChange({ color: e.target.value })}
            className="w-6 h-6 kiosk:w-7 kiosk:h-7 rounded cursor-pointer bg-transparent border-0 p-0"
            title="Custom color"
          />
        </div>
        {errors.color && <p className="text-xs text-red-400">{errors.color}</p>}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className={stBtnSecondary}>Cancel</button>
        <button onClick={onSave}   className={`${stBtnPrimary} flex-1`}>
          {form.id ? 'Save Changes' : 'Add Subteam'}
        </button>
      </div>
    </div>
  );
}

// ── Skills Tab ────────────────────────────────────────────────

interface SkillFormState {
  id: string | null;
  name: string;
  subteamId: string;
  description: string;
}

function SkillsTab() {
  const db          = useTeamStore(s => s.db);
  const addSkill    = useTeamStore(s => s.addSkill);
  const updateSkill = useTeamStore(s => s.updateSkill);
  const deleteSkill = useTeamStore(s => s.deleteSkill);

  const [form, setForm] = useState<SkillFormState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openAdd() {
    setForm({ id: null, name: '', subteamId: '', description: '' });
    setErrors({});
    setConfirmDeleteId(null);
  }

  function openEdit(id: string) {
    const sk = db.skills.find(s => s.id === id);
    if (!sk) return;
    setForm({ id, name: sk.name, subteamId: sk.subteamId ?? '', description: sk.description ?? '' });
    setErrors({});
    setConfirmDeleteId(null);
  }

  function cancelForm() {
    setForm(null);
    setErrors({});
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form?.name.trim()) e.name = 'Required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function saveForm() {
    if (!form || !validateForm()) return;
    const data = {
      name: form.name.trim(),
      subteamId: form.subteamId || undefined,
      description: form.description.trim() || undefined,
    };
    if (form.id) {
      updateSkill(form.id, data);
    } else {
      addSkill(data);
    }
    setForm(null);
  }

  function confirmDelete(id: string) {
    deleteSkill(id);
    setConfirmDeleteId(null);
    if (form?.id === id) setForm(null);
  }

  // Group by subteam for display
  const skillsBySubteam: { label: string; color?: string; skills: typeof db.skills }[] = [];

  // First: skills with subteamId, grouped per subteam order
  db.subteams.forEach(st => {
    const stSkills = db.skills.filter(sk => sk.subteamId === st.id);
    if (stSkills.length > 0) {
      skillsBySubteam.push({ label: st.name, color: st.color, skills: stSkills });
    }
  });

  // Then: skills with no subteam
  const unassigned = db.skills.filter(sk => !sk.subteamId);
  if (unassigned.length > 0) {
    skillsBySubteam.push({ label: 'General', skills: unassigned });
  }

  return (
    <div className="p-4 space-y-4">

      {db.skills.length === 0 && !form && (
        <p className="text-sm kiosk:text-base text-gray-500 italic py-4 text-center">
          No skills yet.
        </p>
      )}

      {skillsBySubteam.map(group => (
        <div key={group.label}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-2">
            {group.color && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
            )}
            <span className="text-xs kiosk:text-sm text-gray-500 font-medium uppercase tracking-wide">
              {group.label}
            </span>
          </div>

          <div className="space-y-1.5">
            {group.skills.map(sk => {
              const subteam = db.subteams.find(s => s.id === sk.subteamId);
              const isEditing    = form?.id === sk.id;
              const isConfirming = confirmDeleteId === sk.id;

              return (
                <div key={sk.id} className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 kiosk:py-3">
                    <span className="text-white text-sm kiosk:text-base flex-1">{sk.name}</span>
                    {subteam && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded text-white shrink-0"
                        style={{ backgroundColor: subteam.color }}
                      >
                        {subteam.name}
                      </span>
                    )}
                    {sk.description && (
                      <span className="text-xs kiosk:text-sm text-gray-500 hidden md:block truncate max-w-[200px]">
                        {sk.description}
                      </span>
                    )}
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => openEdit(sk.id)}
                          className="text-xs kiosk:text-sm text-gray-500 hover:text-white px-2 py-1 transition-colors shrink-0"
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-gray-400">Delete?</span>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 text-gray-500 hover:text-white transition-colors">No</button>
                            <button onClick={() => confirmDelete(sk.id)} className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors">Yes</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(sk.id)}
                            className="text-xs kiosk:text-sm text-gray-600 hover:text-red-400 px-1 py-1 transition-colors shrink-0"
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {isEditing && form && (
                    <SkillForm
                      form={form}
                      errors={errors}
                      subteams={db.subteams}
                      onChange={patch => setForm(prev => prev ? { ...prev, ...patch } : prev)}
                      onSave={saveForm}
                      onCancel={cancelForm}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add form */}
      {form && form.id === null && (
        <div className="rounded-lg border border-blue-700 bg-gray-900 overflow-hidden">
          <SkillForm
            form={form}
            errors={errors}
            subteams={db.subteams}
            onChange={patch => setForm(prev => prev ? { ...prev, ...patch } : prev)}
            onSave={saveForm}
            onCancel={cancelForm}
          />
        </div>
      )}

      {/* Add button */}
      {!form && (
        <button
          onClick={openAdd}
          className="w-full py-2 kiosk:py-3 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 text-sm kiosk:text-base transition-colors"
        >
          + Add Skill
        </button>
      )}
    </div>
  );
}

function SkillForm({
  form,
  errors,
  subteams,
  onChange,
  onSave,
  onCancel,
}: {
  form: SkillFormState;
  errors: Record<string, string>;
  subteams: { id: string; name: string; color: string }[];
  onChange: (patch: Partial<SkillFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs kiosk:text-sm text-gray-400 block">Skill Name *</label>
          <input
            type="text"
            autoFocus
            value={form.name}
            onChange={e => onChange({ name: e.target.value })}
            className={stInput(errors.name)}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs kiosk:text-sm text-gray-400 block">Subteam</label>
          <select
            value={form.subteamId}
            onChange={e => onChange({ subteamId: e.target.value })}
            className={stInput()}
          >
            <option value="">— None / General —</option>
            {subteams.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs kiosk:text-sm text-gray-400 block">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="e.g. Onshape, Java, soldering…"
          className={stInput()}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className={stBtnSecondary}>Cancel</button>
        <button onClick={onSave}   className={`${stBtnPrimary} flex-1`}>
          {form.id ? 'Save Changes' : 'Add Skill'}
        </button>
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────

const stBtnPrimary =
  'px-4 py-1.5 kiosk:py-2 text-sm kiosk:text-base bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors';

const stBtnSecondary =
  'px-3 py-1.5 kiosk:py-2 text-sm kiosk:text-base rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors';

function stInput(error?: string) {
  return `w-full px-3 py-2 kiosk:py-2.5 rounded bg-gray-800 border text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
  }`;
}
