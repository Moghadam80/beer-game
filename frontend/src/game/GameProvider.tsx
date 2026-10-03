import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GameContext, type GameActions, type GameContextValue } from './context';
import { GAME_KEY } from './hooks';
import type { ClientMessage, GameView, ServerMessage, Session } from './protocol';
import { clearSession, loadSession, roomFromUrl, saveSession } from './session';
import { GameSocket, type ConnectionStatus } from './socket';

/**
 * Owns the WebSocket. The server is authoritative: this component only sends
 * intents (create, join, order) and stores whatever view the server pushes.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => {
    const saved = loadSession();
    return { session: saved, room: saved?.code ?? roomFromUrl() };
  });
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const socketRef = useRef<GameSocket | null>(null);
  const sessionRef = useRef<Session | null>(initial.session);
  const roomRef = useRef(initial.room);

  const setView = useCallback(
    (view: GameView | null) => queryClient.setQueryData<GameView | null>(GAME_KEY, view),
    [queryClient],
  );

  const forgetSession = useCallback(() => {
    sessionRef.current = null;
    clearSession();
  }, []);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      setPending(false);
      switch (message.type) {
        case 'state':
          roomRef.current = message.code;
          setView(message);
          break;
        case 'session':
          sessionRef.current = { code: message.code, token: message.token };
          roomRef.current = message.code;
          saveSession(sessionRef.current);
          break;
        case 'created':
          roomRef.current = message.code;
          forgetSession();
          history.replaceState(null, '', `?room=${message.code}`);
          break;
        case 'error':
          setError(message.message);
          if (message.code === 'SESSION_NOT_FOUND') {
            // The saved player no longer exists on the server: carry on as a spectator.
            forgetSession();
            socketRef.current?.send({ action: 'watch', code: roomRef.current });
          } else if (message.code === 'GAME_NOT_FOUND') {
            forgetSession();
            roomRef.current = '';
            setView(null);
          }
          break;
      }
    },
    [forgetSession, setView],
  );

  useEffect(() => {
    const socket = new GameSocket({
      onStatus: setConnection,
      onOpen: () => {
        setPending(false);
        // After a reload or a reconnect, get back into the same room and role.
        if (sessionRef.current) socket.send({ action: 'resume', ...sessionRef.current });
        else if (roomRef.current) socket.send({ action: 'watch', code: roomRef.current });
      },
      onMessage: handleMessage,
    });
    socketRef.current = socket;
    socket.connect();
    return () => socket.dispose();
  }, [handleMessage]);

  const send = useCallback((message: ClientMessage) => {
    if (!socketRef.current?.send(message)) {
      setError('The server is disconnected. Your game is saved; wait for reconnection.');
      return;
    }
    setError('');
    setPending(true);
  }, []);

  const actions = useMemo<GameActions>(
    () => ({
      createRoom: () => send({ action: 'create' }),
      findRoom: (code) => send({ action: 'watch', code }),
      join: (role, name) => send({ action: 'join', code: roomRef.current, role, name }),
      placeOrder: (round, order) => send({ action: 'order', round, order }),
      leave: () => {
        forgetSession();
        roomRef.current = '';
        history.replaceState(null, '', location.pathname);
        setView(null);
        setError('');
        socketRef.current?.reconnect();
      },
    }),
    [send, forgetSession, setView],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      connection,
      error,
      pending,
      busy: connection !== 'online' || pending,
      initialRoom: initial.room,
      actions,
    }),
    [connection, error, pending, initial.room, actions],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
