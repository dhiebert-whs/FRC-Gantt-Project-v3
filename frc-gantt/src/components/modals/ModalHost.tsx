// src/components/modals/ModalHost.tsx
// Single mount point for all application modals.
// Owns: backdrop, focus trap, Escape-to-close, and focus restoration.
// Individual modal components render only their dialog box — no backdrops.

import { useEffect, useRef, useCallback } from 'react';
import { useModalStore } from '../../stores/modalStore';
import { useProjectStore } from '../../stores/projectStore';
import { NewProjectDialog } from '../NewProjectDialog';
import { TaskDialog } from '../TaskDialog';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalHost() {
  const activeModal  = useModalStore(s => s.activeModal);
  const activeTaskId = useModalStore(s => s.activeTaskId);
  const closeModal   = useModalStore(s => s.closeModal);
  const projectFile  = useProjectStore(s => s.projectFile);
  const containerRef     = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save focus before opening; restore after closing
  useEffect(() => {
    if (activeModal) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => containerRef.current?.focus());
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [activeModal]);

  // Escape closes the active modal
  useEffect(() => {
    if (!activeModal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal, closeModal]);

  // Focus trap: Tab / Shift+Tab cycles within the modal container
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const el = containerRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last  = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!activeModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="outline-none"
        onKeyDown={handleFocusTrap}
      >
        {activeModal === 'newProject' && (
          <NewProjectDialog onClose={closeModal} />
        )}
        {activeModal === 'editTask' && activeTaskId && projectFile && (() => {
          const task = projectFile.tasks.find(t => t.id === activeTaskId);
          return task ? (
            <TaskDialog
              key={activeTaskId}
              task={task}
              project={projectFile.project}
              onClose={closeModal}
            />
          ) : null;
        })()}
      </div>
    </div>
  );
}
