// src/commands/useCommands.ts
// Hook that wires a CommandContext into stable dispatch/isEnabled functions.
// Uses a ref so dispatch stays referentially stable even as context values change.

import { useCallback, useRef, useEffect } from 'react';
import { APP_COMMANDS, type CommandContext, type CommandId } from './appCommands';

export function useCommands(ctx: CommandContext) {
  const ctxRef = useRef(ctx);
  useEffect(() => { ctxRef.current = ctx; });

  // Stable reference — always reads latest ctx via ref
  const dispatch = useCallback((id: CommandId) => {
    const cmd = APP_COMMANDS.find(c => c.id === id);
    if (cmd && cmd.isEnabled(ctxRef.current)) cmd.run(ctxRef.current);
  }, []);

  const isEnabled = useCallback((id: CommandId) => {
    return APP_COMMANDS.find(c => c.id === id)?.isEnabled(ctxRef.current) ?? false;
  }, []);

  return { dispatch, isEnabled, commands: APP_COMMANDS };
}
