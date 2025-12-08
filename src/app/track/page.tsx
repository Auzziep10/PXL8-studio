import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, Loader, Truck, Home, Search } from 'lucide-react';

const timeline = [
    { status: 'Order Placed', date: 'July 30, 2024, 11:00 AM', icon: CheckCircle, completed: true },
    { status: 'Processing', date: 'July 30, 2024, 11:05 AM', icon: Loader, completed: true },
    { status: 'Printed', date: 'July 31, 2024, 02:30 PM', icon: Package, completed: true },
    { status: 'Shipped', date: 'July 31, 2024, 05:00 PM', icon: Truck, completed: true },
    { status: 'Delivered', date: null, icon: Home, completed: false },
]

export default function TrackOrderPage() {
  const showResults = false; // Set to true to show hardcoded results

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Track Your Order</CardTitle>
          <p className="text-muted-foreground">Enter your Order ID (e.g., ORD-1001) or Tracking ID.</p>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="tracking-id" className="sr-only">
                Tracking ID
              </Label>
              <Input
                id="tracking-id"
                defaultValue=""
                placeholder="Enter your ID..."
              />
            </div>
            <Button type="submit" className="px-6">
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {showResults ? (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Order ORD-1003 Status</CardTitle>
                <p className="text-muted-foreground">Current status: <span className="text-primary font-semibold">Shipped</span></p>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    {timeline.map((event, index) => (
                        <div key={index} className="flex items-start">
                            <div className="absolute left-0 top-0 flex flex-col items-center">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${event.completed ? 'bg-primary' : 'bg-secondary'}`}>
                                    <event.icon className={`h-4 w-4 ${event.completed ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                </div>
                                {index < timeline.length - 1 && (
                                    <div className={`w-0.5 grow ${timeline[index + 1].completed ? 'bg-primary' : 'bg-secondary'}`} style={{minHeight: '4rem'}}></div>
                                )}
                            </div>
                            <div className="pb-12 ml-6">
                                <p className="font-semibold">{event.status}</p>
                                <p className="text-sm text-muted-foreground">{event.date || 'Pending...'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      ) : (
        <div className="mt-8 text-center text-muted-foreground">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-white">No order found</h3>
            <p className="mt-1 text-sm text-gray-500">Enter an order ID to see its status.</p>
        </div>
      )}
    </div>
  );
}
