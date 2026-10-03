import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppShell } from '@/components/AppShell';
import { RoomBar } from '@/components/RoomBar';
import { useGame, useGameView } from '@/game/hooks';
import { isPlayerView, type GameView } from '@/game/protocol';
import { GameScreen } from '@/screens/GameScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { SpectatorScreen } from '@/screens/SpectatorScreen';

export default function App() {
  const { error, connection } = useGame();
  const view = useGameView();

  return (
    <AppShell>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {connection === 'reconnecting' && (
        <Alert>
          <AlertDescription>Your role and orders are saved. Reconnecting automatically…</AlertDescription>
        </Alert>
      )}
      {view ? <Room view={view} /> : <HomeScreen />}
    </AppShell>
  );
}

function Room({ view }: { view: GameView }) {
  return (
    <>
      <RoomBar view={view} />
      <CurrentScreen view={view} />
    </>
  );
}

function CurrentScreen({ view }: { view: GameView }) {
  if (view.status === 'waiting') return <LobbyScreen view={view} />;
  if (view.status === 'finished' && view.results) return <ResultsScreen view={view} results={view.results} />;
  // key: the order form starts fresh every round
  if (isPlayerView(view)) return <GameScreen key={view.round} view={view} />;
  return <SpectatorScreen view={view} />;
}
