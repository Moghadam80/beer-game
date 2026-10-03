import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGame } from '@/game/hooks';

export function HomeScreen() {
  const { actions, busy, initialRoom } = useGame();
  const [code, setCode] = useState(initialRoom);

  function handleFind(event: FormEvent) {
    event.preventDefault();
    actions.findRoom(code.trim().toUpperCase());
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="bg-secondary">
        <CardHeader>
          <CardTitle className="text-2xl">Keep the chain moving.</CardTitle>
          <CardDescription>Four roles. Twenty rounds. One shared goal: keep inventory and shortages low.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Orders travel upstream in one round; shipments travel downstream in two. Every role sees only its own
            numbers.
          </p>
          <Button disabled={busy} onClick={() => actions.createRoom()}>
            Create a room
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join your team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleFind} className="space-y-3">
            <Label htmlFor="room-code">Room code</Label>
            <Input
              id="room-code"
              placeholder="A1B2C3"
              value={code}
              maxLength={6}
              required
              pattern="[A-Fa-f0-9]{6}"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <Button type="submit" disabled={busy}>
              Find room
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Playing alone? Open four fresh tabs and choose a different role in each.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
