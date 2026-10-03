import { useState } from 'react';
import { PlayerList } from '@/components/PlayerList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGame } from '@/game/hooks';
import { ROLE_LABELS, type GameView } from '@/game/protocol';

export function LobbyScreen({ view }: { view: GameView }) {
  const { actions, busy } = useGame();
  const [name, setName] = useState('');
  const seated = view.role !== null;
  const trimmedName = name.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {view.role ? `You are the ${ROLE_LABELS[view.role]}` : 'Choose your role'}
        </CardTitle>
        <CardDescription>The first round starts automatically when all four roles are taken.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!seated && (
          <div className="max-w-sm space-y-2">
            <Label htmlFor="player-name">Your name</Label>
            <Input
              id="player-name"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}
        <PlayerList
          view={view}
          className="sm:grid-cols-4"
          renderAction={(player) =>
            !seated && !player.taken ? (
              <Button
                size="sm"
                className="mt-2"
                disabled={busy || trimmedName === ''}
                onClick={() => actions.join(player.role, trimmedName)}
              >
                Take role
              </Button>
            ) : null
          }
        />
      </CardContent>
    </Card>
  );
}
