// ============================================================
// FRC Gantt App — Display Mode Resolution
// src/utils/displayMode.ts
//
// Determines whether the app renders in kiosk (ClearTouch board)
// or desktop (laptop) layout. The setting is stored in AppSettings
// and applied as data-mode="kiosk|desktop" on the App root div.
// Components use the `kiosk:` Tailwind variant (defined in index.css)
// to opt in to larger touch targets, font sizes, and panel widths.
// ============================================================

import type { AppSettings } from '../types';

export type DisplayMode = 'kiosk' | 'desktop';

/**
 * Resolves the effective display mode from the persisted setting.
 *
 * 'auto' — detects ClearTouch via touch capability AND screen width >= 1920px.
 *          Falls back to 'desktop' on a normal laptop even at fullscreen.
 * 'kiosk'   — always kiosk layout regardless of screen.
 * 'desktop' — always desktop layout regardless of screen.
 */
export function resolveDisplayMode(
  setting: AppSettings['displayMode'],
): DisplayMode {
  if (setting === 'kiosk')   return 'kiosk';
  if (setting === 'desktop') return 'desktop';
  // 'auto': treat as ClearTouch only when the display is both touch-capable
  // and at least 1920px wide (i.e. not a regular laptop even in fullscreen).
  const touchCapable = navigator.maxTouchPoints > 0;
  const largeScreen  = window.screen.width >= 1920;
  return (touchCapable && largeScreen) ? 'kiosk' : 'desktop';
}
