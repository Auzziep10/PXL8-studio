
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, ShoppingCart } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getStatusColor } from '@/lib/data';
import { Order, OrderStatus } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { subMonths, format, getMonth, getYear } from 'date-fns';

const chartConfig = {
  orders: {
    label: 'Orders',
    color: 'hsl(var(--primary))',
  },
};

export default function CustomerDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userOrdersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/orders`),
      orderBy('orderDate', 'desc')
    );
  }, [user, firestore]);

  const { data: userOrders, isLoading: areOrdersLoading } = useCollection<Order>(userOrdersQuery);

  const dashboardStats = useMemo(() => {
    if (!userOrders) {
      return {
        totalSpend: 0,
        activeOrdersCount: 0,
        pendingCount: 0,
        processingCount: 0,
        shippedItems: 0,
        chartData: [],
      };
    }

    const totalSpend = userOrders.reduce((acc, order) => acc + (order.total || 0), 0);

    const activeOrders = userOrders.filter(
      (o) =>
        o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING
    );
    const activeOrdersCount = activeOrders.length;
    const pendingCount = activeOrders.filter(o => o.status === OrderStatus.PENDING).length;
    const processingCount = activeOrders.filter(o => o.status === OrderStatus.PROCESSING).length;
    
    const shippedItems = userOrders
      .filter(o => o.status === OrderStatus.SHIPPED || o.status === OrderStatus.DELIVERED)
      .reduce((acc, order) => acc + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    // Prepare data for the last 6 months
    const now = new Date();
    const monthLabels = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(now, 5 - i);
        return {
            month: format(d, 'MMM'),
            key: `${getYear(d)}-${getMonth(d)}`
        };
    });
    
    const monthlyOrders = userOrders.reduce<Record<string, number>>((acc, order) => {
        const orderDate = new Date(order.orderDate);
        const key = `${getYear(orderDate)}-${getMonth(orderDate)}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const chartData = monthLabels.map(m => ({
        month: m.month,
        orders: monthlyOrders[m.key] || 0
    }));


    return { totalSpend, activeOrdersCount, pendingCount, processingCount, shippedItems, chartData };
  }, [userOrders]);


  if (areOrdersLoading) {
    // A loading state could be added here for better UX
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardStats.totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {userOrders?.length || 0} orders
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardStats.activeOrdersCount}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.pendingCount} Pending, {dashboardStats.processingCount} Processing
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardStats.shippedItems}</div>
            <p className="text-xs text-muted-foreground">
              Total items shipped this year
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Order Volume</CardTitle>
            <CardDescription>Your order volume over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={dashboardStats.chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                 <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              A list of your most recent orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userOrders && userOrders.length > 0 ? userOrders.slice(0, 5).map((order: Order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium font-mono">
                      <Button variant="link" asChild className="p-0 h-auto font-mono">
                        <Link href={`/order-details?id=${order.orderId}`}>{order.orderId}</Link>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${(order.total || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      You have no recent orders.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
