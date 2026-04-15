// ============================================================
// FRC Gantt App — Member Form Panel
// src/components/TeamPanel/MemberForm.tsx
//
// Slide-in panel for adding or editing a team member.
// Add mode: memberId is undefined.
// Edit mode: memberId is the ID of the member to edit.
// ============================================================

import { useState } from 'react';
import { format } from 'date-fns';
import { useTeamStore } from '../../stores/teamStore';

interface MemberFormProps {
  memberId?: string;   // undefined = add mode
  onClose: () => void;
}

export function MemberForm({ memberId, onClose }: MemberFormProps) {
  const db            = useTeamStore(s => s.db);
  const addMember     = useTeamStore(s => s.addMember);
  const updateMember  = useTeamStore(s => s.updateMember);
  const archiveMember = useTeamStore(s => s.archiveMember);

  const existing = memberId ? db.members.find(m => m.id === memberId) : undefined;
  const isEdit   = !!memberId;

  // ── Form state ──────────────────────────────────────────────
  const [firstName,  setFirstName]  = useState(existing?.firstName  ?? '');
  const [lastName,   setLastName]   = useState(existing?.lastName   ?? '');
  const [isMentor,   setIsMentor]   = useState(existing?.isMentor   ?? false);
  const [grade,      setGrade]      = useState<string>(existing?.grade?.toString() ?? '');
  const [joinDate,   setJoinDate]   = useState(
    existing?.joinDate ?? format(new Date(), 'yyyy-MM-dd'),
  );
  const [subteamIds, setSubteamIds] = useState<string[]>(existing?.subteamIds ?? []);
  const [skillIds,   setSkillIds]   = useState<string[]>(existing?.skillIds   ?? []);
  const [notes,      setNotes]      = useState(existing?.notes ?? '');

  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────
  function toggleSubteam(id: string) {
    setSubteamIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }

  function toggleSkill(id: string) {
    setSkillIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required.';
    if (!lastName.trim())  e.lastName  = 'Required.';
    if (!joinDate)         e.joinDate  = 'Required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const gradeNum = !isMentor && grade
      ? (parseInt(grade, 10) as 9 | 10 | 11 | 12)
      : undefined;

    const data = {
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      isMentor,
      grade:      gradeNum,
      joinDate,
      subteamIds,
      skillIds,
      isActive:   existing?.isActive ?? true,
      notes:      notes.trim() || undefined,
    };

    if (isEdit) {
      updateMember(memberId!, data);
    } else {
      addMember(data);
    }
    onClose();
  }

  function handleArchive() {
    if (!memberId) return;
    archiveMember(memberId);
    onClose();
  }

  // Skills grouped: skills for selected subteams first, others collapsed
  const relevantSkills = db.skills.filter(
    s => !s.subteamId || subteamIds.includes(s.subteamId),
  );
  const otherSkills = db.skills.filter(
    s => s.subteamId && !subteamIds.includes(s.subteamId),
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
    <div
      className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md kiosk:max-w-lg max-h-[90vh] flex flex-col"
      onClick={e => e.stopPropagation()}
    >

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 kiosk:py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-sm kiosk:text-base font-semibold text-white">
          {isEdit ? 'Edit Member' : 'Add Member'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name *" error={errors.firstName}>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoFocus={!isEdit}
              className={input(errors.firstName)}
            />
          </Field>
          <Field label="Last Name *" error={errors.lastName}>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className={input(errors.lastName)}
            />
          </Field>
        </div>

        {/* Mentor toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isMentor}
            onChange={e => { setIsMentor(e.target.checked); if (e.target.checked) setGrade(''); }}
            className="w-4 h-4 kiosk:w-5 kiosk:h-5 rounded accent-blue-500 cursor-pointer"
          />
          <span className="text-sm kiosk:text-base text-gray-300">Mentor (not a student)</span>
        </label>

        {/* Grade — students only */}
        {!isMentor && (
          <Field label="Grade">
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className={input()}
            >
              <option value="">— Not specified —</option>
              <option value="9">9th grade</option>
              <option value="10">10th grade</option>
              <option value="11">11th grade</option>
              <option value="12">12th grade</option>
            </select>
          </Field>
        )}

        {/* Join date */}
        <Field label="Join Date *" error={errors.joinDate}>
          <input
            type="date"
            value={joinDate}
            onChange={e => setJoinDate(e.target.value)}
            className={input(errors.joinDate)}
          />
        </Field>

        {/* Subteams */}
        <Field label="Subteams">
          {db.subteams.length === 0 ? (
            <p className="text-xs kiosk:text-sm text-gray-500 italic">
              No subteams defined yet. Add them in the Subteams tab.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {db.subteams.map(st => {
                const active = subteamIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleSubteam(st.id)}
                    className={`px-2.5 py-1 kiosk:py-1.5 rounded text-xs kiosk:text-sm font-medium border transition-colors ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                    style={active ? { backgroundColor: st.color } : undefined}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {/* Skills */}
        <Field label="Skills">
          {db.skills.length === 0 ? (
            <p className="text-xs kiosk:text-sm text-gray-500 italic">
              No skills defined yet. Add them in the Skills tab.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Skills matching selected subteams shown first */}
              {relevantSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {relevantSkills.map(sk => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => toggleSkill(sk.id)}
                      className={`px-2 py-0.5 kiosk:py-1 rounded text-xs kiosk:text-sm border transition-colors ${
                        skillIds.includes(sk.id)
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      {sk.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Skills from other subteams — collapsed by default */}
              {otherSkills.length > 0 && (
                <details>
                  <summary className="text-xs kiosk:text-sm text-gray-500 cursor-pointer hover:text-gray-400 select-none">
                    Other skills ({otherSkills.length})
                  </summary>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {otherSkills.map(sk => (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => toggleSkill(sk.id)}
                        className={`px-2 py-0.5 kiosk:py-1 rounded text-xs kiosk:text-sm border transition-colors ${
                          skillIds.includes(sk.id)
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        {sk.name}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Availability, IEP accommodations, etc."
            rows={3}
            className="w-full px-3 py-2 kiosk:py-2.5 rounded bg-gray-800 border border-gray-700 text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
          />
        </Field>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 kiosk:py-4 border-t border-gray-800 shrink-0 space-y-2">
        <div className="flex gap-2">
          <button onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} className={`${btnPrimary} flex-1`}>
            {isEdit ? 'Save Changes' : 'Add Member'}
          </button>
        </div>

        {/* Archive (edit mode only, only for active members) */}
        {isEdit && existing?.isActive && (
          confirmArchive ? (
            <div className="flex items-center gap-2">
              <span className="text-xs kiosk:text-sm text-gray-400 flex-1">Move to alumni?</span>
              <button
                onClick={() => setConfirmArchive(false)}
                className="text-xs kiosk:text-sm px-2 py-1 rounded text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="text-xs kiosk:text-sm px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
              >
                Confirm
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmArchive(true)}
              className="w-full text-xs kiosk:text-sm text-gray-600 hover:text-red-400 py-1 transition-colors"
            >
              Move to Alumni
            </button>
          )
        )}
      </div>{/* end footer */}
    </div>{/* end content box */}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────

const btnPrimary =
  'px-4 py-1.5 kiosk:py-3 text-sm kiosk:text-base bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors';

const btnSecondary =
  'px-3 py-1.5 kiosk:py-3 text-sm kiosk:text-base rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors';

function input(error?: string) {
  return `w-full px-3 py-2 kiosk:py-2.5 rounded bg-gray-800 border text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs kiosk:text-sm text-gray-400 block">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
