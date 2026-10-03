import { OrderCard } from '@/components/OrderCard';
import { PlayerList } from '@/components/PlayerList';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_LABELS, type PlayerGameView } from '@/game/protocol';

export function GameScreen({ view }: { view: PlayerGameView }) {
  const { own, role } = view;
  const submitted = view.players.find((player) => player.role === role)?.submitted ?? false;
  const waitingFor = view.players.filter((player) => !player.submitted).map((player) => ROLE_LABELS[player.role]);

  const stats = [
    { label: 'Inventory', value: own.inventory, note: 'Units left after shipping' },
    { label: 'Backlog', value: own.backlog, note: 'Unfulfilled downstream orders' },
    { label: 'Shipment arrived', value: own.shipmentArrived, note: 'Received this round' },
    { label: 'Incoming order', value: own.incomingOrder, note: 'Received this round' },
    { label: 'Automatically shipped', value: own.shipped, note: 'Sent downstream this round' },
    { label: 'Last order placed', value: own.lastOrderPlaced, note: 'Your latest upstream order' },
    { label: 'Round cost', value: own.roundCost, note: '0.5 × inventory + backlog' },
    { label: 'Cost so far', value: own.totalCost, note: 'Cumulative through this round' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{ROLE_LABELS[role]} dashboard</h2>
        <span className="text-sm text-muted-foreground">
          Round <strong className="text-foreground">{view.round}</strong> / {view.totalRounds}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <OrderCard round={view.round} lastOrderPlaced={own.lastOrderPlaced} submitted={submitted} />
        <Card>
          <CardHeader>
            <CardTitle>Round submissions</CardTitle>
            <CardDescription aria-live="polite">
              {waitingFor.length ? `Waiting for: ${waitingFor.join(', ')}` : 'All orders received.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerList view={view} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
