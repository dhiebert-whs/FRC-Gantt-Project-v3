// src/components/AppMenuBar/index.tsx
// Desktop-style application menu bar. Menu items render declaratively from
// the command registry so accelerators, labels, and enabled states stay in sync
// with keyboard shortcuts and future toolbar buttons.

import { useState, useRef, useEffect } from 'react';
import { APP_COMMANDS, type CommandId } from '../../commands/appCommands';

export interface AppMenuBarProps {
  dispatch: (id: CommandId) => void;
  isEnabled: (id: CommandId) => boolean;
}

type MenuItemDef =
  | { type: 'command'; id: CommandId }
  | { type: 'separator' };

interface MenuDef {
  label: string;
  /** Undefined = stub (no dropdown yet); populated as phases add commands */
  items?: MenuItemDef[];
}

const MENUS: MenuDef[] = [
  {
    label: 'File',
    items: [
      { type: 'command', id: 'project.new' },
      { type: 'command', id: 'project.open' },
      { type: 'separator' },
      { type: 'command', id: 'project.save' },
      { type: 'command', id: 'project.saveAs' },
      { type: 'separator' },
      { type: 'command', id: 'project.close' },
    ],
  },
  { label: 'Edit' },
  { label: 'View' },
  { label: 'Tasks' },
  { label: 'Members' },
  { label: 'Settings' },
  { label: 'Help' },
];

const CMD_MAP = new Map(APP_COMMANDS.map(c => [c.id, c]));

export function AppMenuBar({ dispatch, isEnabled }: AppMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleCommand(id: CommandId) {
    setOpenMenu(null);
    dispatch(id);
  }

  function toggleMenu(label: string, hasItems: boolean) {
    if (!hasItems) { setOpenMenu(null); return; }
    setOpenMenu(prev => (prev === label ? null : label));
  }

  // Hover-switching: when any menu is open, hovering another header switches to it
  function handleMouseEnter(label: string, hasItems: boolean) {
    if (openMenu !== null) {
      if (hasItems) {
        setOpenMenu(label);
      } else {
        setOpenMenu(null);
      }
    }
  }

  return (
    <div
      ref={barRef}
      style={{ display: 'flex', flexDirection: 'row' }}
      className="items-stretch h-8 kiosk:h-10 bg-gray-950 border-b border-gray-800 shrink-0 select-none"
      role="menubar"
    >
      {MENUS.map(menu => {
        const hasItems = !!(menu.items && menu.items.length > 0);
        const isOpen = openMenu === menu.label;
        const isStub = !hasItems;

        return (
          <div key={menu.label} className="relative flex">
            <button
              role="menuitem"
              aria-haspopup={hasItems}
              aria-expanded={isOpen}
              onClick={() => toggleMenu(menu.label, hasItems)}
              onMouseEnter={() => handleMouseEnter(menu.label, hasItems)}
              className={`px-3 flex items-center text-sm kiosk:text-base transition-colors ${
                isStub
                  ? 'text-gray-500 cursor-default'
                  : isOpen
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {menu.label}
            </button>

            {isOpen && hasItems && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-0.5 w-48 bg-gray-800 border border-gray-700 rounded shadow-xl z-50"
              >
                {menu.items!.map((item, i) => {
                  if (item.type === 'separator') {
                    return <div key={i} role="separator" className="my-1 border-t border-gray-700" />;
                  }
                  const cmd = CMD_MAP.get(item.id);
                  if (!cmd) return null;
                  const enabled = isEnabled(item.id);
                  return (
                    <button
                      key={item.id}
                      role="menuitem"
                      aria-label={cmd.label}
                      onClick={() => enabled && handleCommand(item.id)}
                      disabled={!enabled}
                      className={`flex items-center justify-between w-full px-3 py-1.5 kiosk:py-2.5 text-sm kiosk:text-base text-left transition-colors ${
                        enabled
                          ? 'text-gray-200 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 cursor-default'
                      }`}
                    >
                      <span>{cmd.label}</span>
                      {cmd.accelerator && (
                        <span className="text-gray-500 text-xs ml-6">{cmd.accelerator}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
