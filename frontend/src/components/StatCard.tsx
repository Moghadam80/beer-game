import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: number;
  note: string;
}

export function StatCard({ label, value, note }: StatCardProps) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-3xl font-semibold tabular-nums">{formatNumber(value)}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
