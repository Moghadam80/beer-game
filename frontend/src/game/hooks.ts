import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GameContext, type GameContextValue } from './context';
import type { GameView } from './protocol';

export const GAME_KEY = ['game'] as const;

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}

/**
 * The latest view the server pushed to this tab. The WebSocket writes it into
 * the query cache (GameProvider); components subscribe to it here.
 */
export function useGameView(): GameView | null {
  const { data } = useQuery<GameView | null>({
    queryKey: GAME_KEY,
    queryFn: () => null, // never runs: the query is disabled and only the socket fills it
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? null;
}
