
'use client';

import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, FileText, CheckCircle, Truck, PackageCheck } from 'lucide-react';
import { mockOrders, getStatusColor } from '@/lib/data';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function AdminDashboardPage() {
  const [showPrintReady, setShowPrintReady] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Orders</CardTitle>
            <CardDescription>Manage and fulfill incoming customer orders.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
              <Label htmlFor="image-toggle" className='text-sm'>Show Print-Ready</Label>
              <Switch id="image-toggle" checked={showPrintReady} onCheckedChange={setShowPrintReady} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockOrders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Gang sheet preview"
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={showPrintReady ? order.printReadyUrl : order.previewUrl}
                    width="64"
                    data-ai-hint="print layout"
                  />
                </TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell>{order.orderId}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(order.orderDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download Assets (ZIP)</DropdownMenuItem>
                      <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> View Packing Slip</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                      <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Mark as Processing</DropdownMenuItem>
                      <DropdownMenuItem><PackageCheck className="mr-2 h-4 w-4" /> Mark as Printed</DropdownMenuItem>
                      <DropdownMenuItem><Truck className="mr-2 h-4 w-4" /> Mark as Shipped</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
