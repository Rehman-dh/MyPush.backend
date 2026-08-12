"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Point {
  label: string;
}

const sentConfig = {
  sent: { label: "Sent", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const ctrConfig = {
  ctr: { label: "CTR %", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const splitConfig = {
  value: { label: "Devices" },
  Subscribed: { label: "Subscribed", color: "hsl(var(--chart-1))" },
  Unsubscribed: { label: "Unsubscribed", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

const SPLIT_COLORS = ["hsl(var(--chart-1))", "hsl(var(--muted-foreground))"];

export function DashboardCharts({
  sentSeries,
  ctrSeries,
  subscriptionSplit,
}: {
  sentSeries: (Point & { sent: number })[];
  ctrSeries: (Point & { ctr: number })[];
  subscriptionSplit: { name: string; value: number }[];
}) {
  const hasDevices = subscriptionSplit.some((s) => s.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications sent</CardTitle>
          <CardDescription>Delivered per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={sentConfig} className="h-[240px] w-full">
            <BarChart accessibilityLayer data={sentSeries} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Click-through rate</CardTitle>
          <CardDescription>CTR % per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ctrConfig} className="h-[240px] w-full">
            <LineChart accessibilityLayer data={ctrSeries} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={32} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="ctr"
                type="monotone"
                stroke="var(--color-ctr)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Subscriptions</CardTitle>
          <CardDescription>Subscribed vs unsubscribed devices</CardDescription>
        </CardHeader>
        <CardContent>
          {hasDevices ? (
            <ChartContainer
              config={splitConfig}
              className="mx-auto aspect-square max-h-[240px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={subscriptionSplit}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  strokeWidth={4}
                >
                  {subscriptionSplit.map((entry, i) => (
                    <Cell key={entry.name} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No registered devices yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
