import { PlayerList } from '@/components/PlayerList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameView } from '@/game/protocol';

export function SpectatorScreen({ view }: { view: GameView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This room is already playing</CardTitle>
        <CardDescription>
          All roles are reserved. A returning player can reload their original tab to resume.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PlayerList view={view} className="sm:grid-cols-4" />
      </CardContent>
    </Card>
  );
}
