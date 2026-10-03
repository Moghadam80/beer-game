import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/format';
import { ROLE_LABELS, ROLES, type GameResults, type GameView } from '@/game/protocol';
import { lazy, Suspense } from 'react';

const GameAnalytics = lazy(
  () =>
    import('../game/GameAnalytics').then((module) => ({
      default: module.GameAnalytics,
    })),
);
interface ResultsScreenProps {
  view: GameView;
  results: GameResults;
}

export function ResultsScreen({ view, results }: ResultsScreenProps) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {view.totalRounds} rounds complete
        </p>
        <CardTitle className="text-2xl">Team results</CardTitle>
        <CardDescription>The shared goal is a lower total cost.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Total cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell>
                  {ROLE_LABELS[role]}
                  {role === view.role && ' (you)'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(results.costs[role])}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Team total</TableCell>
              <TableCell className="text-right text-lg font-semibold tabular-nums">
                {formatNumber(results.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      {view.analytics && view.own && view.role && (
  <Suspense
    fallback={
      <div className="text-sm text-muted-foreground">
        Loading analytics...
      </div>
    }
  >
    <GameAnalytics
      role={view.role}
      history={view.analytics[view.role].history}
    />
  </Suspense>
)}
      </CardContent>
    </Card>
  );
}
