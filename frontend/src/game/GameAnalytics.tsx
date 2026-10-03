import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type {
  AnalyticsRound,
  Role,
} from '@/game/protocol';

type Metric = 'inventory' | 'backlog' | 'order';

type GameAnalyticsProps = {
  role: Role;
  history: AnalyticsRound[];
};

const ROLE_LABELS: Record<Role, string> = {
  retailer: 'Retailer',
  wholesaler: 'Wholesaler',
  distributor: 'Distributor',
  factory: 'Factory',
};

const METRIC_LABELS: Record<Metric, string> = {
  inventory: 'Inventory',
  backlog: 'Backlog',
  order: 'Orders',
};

const METRICS: Metric[] = [
  'inventory',
  'backlog',
  'order',
];

export function GameAnalytics({
  role,
  history,
}: GameAnalyticsProps) {
  return (
    <Card className='mt-4'>
      <CardHeader>
        <CardTitle>Game Analytics</CardTitle>

        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[role]} performance across 20 rounds
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {METRICS.map((metric) => (
          <MetricChart
            key={metric}
            metric={metric}
            data={history}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MetricChart({
  metric,
  data,
}: {
  metric: Metric;
  data: AnalyticsRound[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">
        {METRIC_LABELS[metric]}
      </h3>

      <div className="h-64 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="round"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip />

            <Legend />

            <Line
              type="monotone"
              dataKey={metric}
              name={METRIC_LABELS[metric]}
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}