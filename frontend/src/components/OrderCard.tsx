import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGame } from '@/game/hooks';

interface OrderCardProps {
  round: number;
  lastOrderPlaced: number;
  submitted: boolean;
}

export function OrderCard({ round, lastOrderPlaced, submitted }: OrderCardProps) {
  const { actions, busy } = useGame();
  const [value, setValue] = useState(String(lastOrderPlaced));
  const quantity = Number(value);
  const valid = value.trim() !== '' && Number.isSafeInteger(quantity) && quantity >= 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (valid && !busy && !submitted) actions.placeOrder(round, quantity);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{submitted ? 'Order submitted' : 'Place your upstream order'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <p className="text-emerald-700">You ordered {lastOrderPlaced} units. Waiting for the other roles.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Label htmlFor="order-quantity">Units to order</Label>
            <Input
              id="order-quantity"
              type="number"
              min={0}
              step={1}
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit" disabled={busy || !valid}>
              Submit order for round {round}
            </Button>
          </form>
        )}
        <p className="text-sm text-muted-foreground">
          Orders cannot be changed after submission. The next round waits for all four players.
        </p>
      </CardContent>
    </Card>
  );
}
