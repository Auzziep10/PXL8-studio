
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, GangSheetItem, User as AppUser, OrderItem } from '@/lib/types';
import {
  Printer,
  Search,
  Download,
  X,
  QrCode,
  ChevronRight,
  User as UserIcon,
  DollarSign,
  Package,
  History,
  ArrowLeft,
  ArrowUpRight,
  ZoomIn,
  FileText,
  Database,
  Cloud,
} from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { checkHealth } from '@/services/backend';
import { isCloudEnabled } from '@/lib/constants';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, updateDoc, doc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

type SortKey = 'date' | 'totalPrice' | 'status';
type SortDirection = 'asc' | 'desc';

// --- AssetCard Component ---
const AssetCard: React.FC<{
  item: OrderItem; // Use the simpler OrderItem type
  index: number;
  onPreview: (url: string) => void;
}> = ({ item, index, onPreview }) => {
  
  // The production-ready URL is now item.printReadyUrl
  const displayUrl = item.printReadyUrl;

  return (
    <div className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden shadow-sm hover:border-white/20 transition-colors">
      {/* Card Header */}
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 justify-between items-center bg-zinc-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">
              Sheet #{index + 1}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-zinc-500">
            <span>
              {item.sheetWidth}" x {item.sheetHeight}"
            </span>
            <span>•</span>
            <span>Qty: {item.quantity}</span>
            {item.id && ( // Use item.id which is the tracking ID
              <>
                <span>•</span>
                <span className="flex items-center text-accent font-mono bg-accent/5 px-1 rounded">
                  <QrCode className="w-3 h-3 mr-1" />
                  {item.id}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download button now directly links to the print-ready URL */}
          <a
            href={displayUrl}
            download={`sheet-${index + 1}-${item.id}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-3 h-3 mr-1.5" />
            Download
          </a>
        </div>
      </div>

      {/* Card Body - Image Preview */}
      <div
        className="p-8 bg-checkerboard-dark flex justify-center items-center relative min-h-[300px] group cursor-zoom-in"
        onClick={() => displayUrl && onPreview(displayUrl)}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Asset Preview"
              className="max-h-[500px] max-w-full object-contain shadow-2xl border border-white/5 bg-transparent"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 p-8">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p>No preview available</p>
          </div>
        )}

        <div className="absolute top-4 left-4 flex gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-md border border-white/10 shadow-lg bg-primary/80 text-black`}
          >
            Print Ready (QR)
          </span>
        </div>
      </div>
    </div>
  );
};

function AdminFulfillmentContent() {
    const firestore = useFirestore();
    // Re-instantiate necessary hooks within the authorized component
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Firestore Queries - These are now safe because this component only renders for admins.
    const ordersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'orders')) : null, [firestore]);
    const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

    // Component State
    const [viewMode, setViewMode] = useState<'orders' | 'customers'>('orders');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [
        selectedCustomerForArchive,
        setSelectedCustomerForArchive,
    ] = useState<string | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [
        healthStatus,
        setHealthStatus,
    ] = useState<{ db: boolean; storage: boolean; message: string; bucketName?: string } | null>(
        null
    );
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const [
        sortConfig,
        setSortConfig,
    ] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'date',
        direction: 'desc',
    });
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
    
    // Effect to handle URL query param for orderId
    useEffect(() => {
        const orderIdFromUrl = searchParams.get('orderId');
        if (orderIdFromUrl && allOrders) {
        // Find order by the new numeric ID format
        const foundOrder = allOrders.find(o => o.orderId === orderIdFromUrl);
        if (foundOrder) {
            setSelectedOrderId(foundOrder.id);
            // Clean the URL
            router.replace('/admin', { scroll: false });
        }
        }
    }, [searchParams, allOrders, router]);


    const selectedOrder = useMemo(
        () => allOrders?.find((o) => o.id === selectedOrderId) || null,
        [allOrders, selectedOrderId]
    );

    const updateStatus = async (id: string, status: OrderStatus) => {
        if (!firestore || !selectedOrder) return;
        const orderDocRef = doc(firestore, 'orders', id);
        await updateDoc(orderDocRef, { status });
        setSelectedOrderId(null);
    };

    const customers = useMemo(() => {
        if (!Array.isArray(allUsers)) return [];

        return allUsers.filter(user => {
        const term = searchTerm.toLowerCase();
        const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
        });
    }, [allUsers, searchTerm]);

    const customerOrderData = useMemo(() => {
        if (!allOrders) return new Map();
        const map = new Map<string, { orderCount: number, totalSpend: number }>();
        allOrders.forEach(order => {
            const stats = map.get(order.customerId) || { orderCount: 0, totalSpend: 0 };
            stats.orderCount += 1;
            stats.totalSpend += order.total || 0;
            map.set(order.customerId, stats);
        });
        return map;
    }, [allOrders]);

    useEffect(() => {
        if (searchTerm.length >= 8 && !isNaN(Number(searchTerm))) {
        const found = allOrders?.find(o => o.orderId === searchTerm);
        if (found) {
            setSelectedOrderId(found.id);
            setViewMode('orders');
        }
        }
    }, [searchTerm, allOrders]);

    const runHealthCheck = async () => {
        setIsCheckingHealth(true);
        try {
        const status = await checkHealth();
        setHealthStatus(status);
        } catch (e) {
        console.error(e);
        } finally {
        setIsCheckingHealth(false);
        }
    };

    const processedOrders = useMemo(() => {
        if (!Array.isArray(allOrders)) return [];

        let result = allOrders.filter((order) => {
        const term = searchTerm.toLowerCase();
        const id = (order.orderId || '').toLowerCase();
        const name = (order.customerName || '').toLowerCase();
        const items = Array.isArray(order.items) ? order.items : [];
        const hasTracking = items.some(
            (i: any) => i.id.toLowerCase().includes(term)
        );

        return id.includes(term) || name.includes(term) || hasTracking;
        });

        if (statusFilter !== 'ALL') {
        result = result.filter((order) => order.status === statusFilter);
        }

        result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
            case 'date':
            const d1 = new Date(a.orderDate).getTime();
            const d2 = new Date(b.orderDate).getTime();
            aValue = isNaN(d1) ? 0 : d1;
            bValue = isNaN(d2) ? 0 : d2;
            break;
            case 'totalPrice':
            aValue = a.total || 0;
            bValue = b.total || 0;
            break;
            case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
            default:
            aValue = new Date(a.orderDate).getTime();
            bValue = new Date(b.orderDate).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
        });

        return result;
    }, [allOrders, searchTerm, statusFilter, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
        case OrderStatus.PENDING:
            return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        case OrderStatus.PROCESSING:
            return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        case OrderStatus.PRINTED:
            return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
        case OrderStatus.SHIPPED:
            return 'bg-primary/20 text-primary border-primary/30';
        case OrderStatus.DELIVERED:
            return 'bg-accent/20 text-accent border-accent/30';
        default:
            return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    const statusWorkflow: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.PRINTED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
    ];

    const getNextStatus = (current: OrderStatus): OrderStatus | null => {
        const idx = statusWorkflow.indexOf(current);
        if (idx !== -1 && idx < statusWorkflow.length - 1) {
        return statusWorkflow[idx + 1];
        }
        return null;
    };

    const handleDownloadAllZip = async (targetOrder: Order) => {
        if (!targetOrder) return;
        setIsZipping(true);
        try {
        const zip = new JSZip();
        const folder = zip.folder(`Order-${targetOrder.orderId}`);

        for (let i = 0; i < targetOrder.items.length; i++) {
            const item = targetOrder.items[i];

            const urlToUse = item.printReadyUrl;

            if (urlToUse) {
                try {
                const response = await fetch(urlToUse);
                const blob = await response.blob();
                const fileName = `Sheet-${i + 1}-${
                    targetOrder.orderId || 'NoID'
                }.png`;
                folder?.file(fileName, blob);
                } catch (e) {
                console.warn('Could not fetch asset for zipping', urlToUse);
                }
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const saveFile = (FileSaver as any).saveAs || FileSaver;
        saveFile(content, `Order-${targetOrder.orderId}-Production-Assets.zip`);
        } catch (error) {
        console.error('Failed to zip assets', error);
        alert('Failed to generate zip file. Please check console.');
        } finally {
        setIsZipping(false);
        }
    };

    const handlePrintPackingSlip = (targetOrder: Order) => {
        if (!targetOrder) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const address = targetOrder.shippingAddress || {
        street: '123 Shipping Lane',
        city: 'Print City',
        state: 'NY',
        zip: '10012',
        };

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Packing Slip - ${targetOrder.orderId}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
                    .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .brand h1 { margin: 0; font-size: 28px; letter-spacing: -1px; }
                    .brand span { color: #f97316; }
                    .order-details { text-align: right; }
                    .order-details h2 { margin: 0 0 5px 0; font-size: 24px; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 14px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; color: #666; }
                    table { width: 100%; border-collapse: collapse; font-size: 14px; }
                    th { text-align: left; padding: 10px; background: #f4f4f4; border-bottom: 1px solid #ddd; }
                    td { padding: 10px; border-bottom: 1px solid #eee; }
                    .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand"><h1>PXL<span>8</span> Fulfillment</h1></div>
                    <div class="order-details"><h2>#${
                    targetOrder.orderId
                    }</h2><p>Date: ${new Date(
        targetOrder.orderDate
        ).toLocaleDateString()}</p></div>
                </div>
                <div class="section">
                    <div class="section-title">Customer</div>
                    <strong>${targetOrder.customerName}</strong><br>
                    ${address.street}<br>${address.city}, ${address.state} ${
        address.zip
        }
                </div>
                <div class="section">
                    <div class="section-title">Items</div>
                    <table>
                        <thead><tr><th>#</th><th>Description</th><th>Qty</th></tr></thead>
                        <tbody>${targetOrder.items
                        .map(
                            (item: OrderItem, idx) =>
                            `<tr><td>${idx + 1}</td><td>Gang Sheet ${
                                item.sheetSizeName
                            }</td><td>${item.quantity}</td></tr>`
                        )
                        .join('')}</tbody>
                    </table>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-4 py-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Fulfillment View</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage orders and customer data
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Health Check */}
          <button
            onClick={runHealthCheck}
            disabled={isCheckingHealth}
            className="flex items-center px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:border-white/20 transition-all"
          >
            {isCheckingHealth ? (
              <span className="flex items-center">Testing...</span>
            ) : (
              <span className="flex items-center">
                <Cloud
                  className={`w-4 h-4 mr-2 ${
                    healthStatus?.storage ? 'text-accent' : 'text-zinc-500'
                  }`}
                />{' '}
                System Health
              </span>
            )}
          </button>

          {/* Health Status Popover/Tooltip area */}
          {healthStatus && (
            <div className="text-xs text-white flex flex-col items-end">
              {healthStatus.storage && healthStatus.db ? (
                <>
                  <span className="text-accent font-bold">● Connected</span>
                  {healthStatus.bucketName && (
                    <span
                      className="text-zinc-500 text-[10px] mt-0.5 max-w-[150px] truncate"
                      title={healthStatus.bucketName}
                    >
                      Bucket: {healthStatus.bucketName}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-red-500 font-bold">
                  ● {healthStatus.message}
                </span>
              )}
            </div>
          )}

          {/* View Toggles */}
          <div className="bg-zinc-900 p-1 rounded-lg border border-white/10 flex">
            <button
              onClick={() => {
                setViewMode('orders');
                setSelectedCustomerForArchive(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'orders'
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Live Orders
            </button>
            <button
              onClick={() => {
                setViewMode('customers');
                setSelectedCustomerForArchive(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'customers'
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Customers
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              viewMode === 'orders'
                ? 'Search by Order ID, Customer Name...'
                : 'Search by Name or Email...'
            }
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-primary focus:border-primary transition-all"
          />
        </div>
        {viewMode === 'orders' && (
          <div className="flex space-x-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderStatus | 'ALL')
              }
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(OrderStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Render */}
      <div className="flex-grow overflow-hidden">
        {viewMode === 'customers' && (
          <div className="flex-grow overflow-y-auto builder-scroll">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {customers.map((customer) => {
                const stats = customerOrderData.get(customer.id) || { orderCount: 0, totalSpend: 0 };
                return (
                    <div
                    key={customer.id}
                    onClick={() => setSelectedCustomerForArchive(customer.id)}
                    className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all cursor-pointer group"
                    >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                        <UserIcon className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                        </div>
                        <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                            LTV
                        </p>
                        <p className="text-lg font-bold text-white">
                            ${stats.totalSpend.toFixed(2)}
                        </p>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                        {customer.firstName} {customer.lastName}
                    </h3>
                    <p className="text-zinc-500 text-sm mb-4 truncate">
                        {customer.email}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-sm">
                        <span className="text-zinc-400 flex items-center">
                        <History className="w-4 h-4 mr-2" /> {stats.orderCount}{' '}
                        Orders
                        </span>
                        <span className="text-primary text-xs font-bold flex items-center group-hover:translate-x-1 transition-transform">
                        View Archive <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                    </div>
                    </div>
                )
              })}
              {customers.length === 0 && !isLoadingUsers && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  No customers found.
                </div>
              )}
               {(isLoadingUsers || isLoadingOrders) && (
                 <div className="col-span-full py-12 text-center text-zinc-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-20 animate-pulse" />
                    <p>Loading customer data...</p>
                 </div>
               )}
            </div>
          </div>
        )}
        {viewMode === 'orders' && !selectedCustomerForArchive && (
          <div className="glass-panel rounded-2xl overflow-hidden flex-grow flex flex-col border border-white/10 shadow-2xl">
            <ImagePreviewModal
              isOpen={!!previewImage}
              onClose={() => setPreviewImage(null)}
              imageUrl={previewImage}
              title="Production File Preview"
            />
            <div className="overflow-auto flex-grow">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-black/20 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      Order Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Sheet Info
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('totalPrice')}
                    >
                      Total
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-zinc-900/10">
                  {isLoadingOrders ? (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                            <Database className="w-12 h-12 mx-auto mb-3 opacity-20 animate-pulse" />
                            <p>Loading orders from Firestore...</p>
                        </td>
                    </tr>
                  ) : processedOrders.length > 0 ? (
                    processedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10 text-primary font-bold text-xs">
                              DTF
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white font-mono">
                                {order.orderId}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {new Date(order.orderDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-zinc-200">
                            {order.customerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-medium text-white bg-zinc-800 px-2 py-1 rounded border border-white/5">
                            {(order.items[0] as any).sheetSizeName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-white">
                            ${(order.total || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-zinc-400 hover:text-white p-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(order.id);
                            }}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-zinc-500"
                      >
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No orders found. Please place a new order for it to appear here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {viewMode === 'customers' && selectedCustomerForArchive && (
          <div className="flex-grow flex flex-col h-full overflow-hidden animate-in fade-in">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setSelectedCustomerForArchive(null)}
                className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-white mr-4 hover:bg-zinc-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {customers.find((c) => c.id === selectedCustomerForArchive)
                    ?.firstName}
                </h2>
                <div className="flex items-center text-sm text-zinc-500 space-x-4 mt-1">
                  <span>ID: {selectedCustomerForArchive}</span>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-2 builder-scroll">
              {allOrders?.filter(
                (o) => o.customerId === selectedCustomerForArchive
              ).length > 0 ? (
                allOrders
                  ?.filter((o) => o.customerId === selectedCustomerForArchive)
                  .map((order: Order) => (
                    <div
                      key={order.id}
                      className="glass-panel rounded-xl border border-white/10 overflow-hidden"
                    >
                      <div className="p-4 bg-zinc-800/30 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-zinc-900 rounded-lg border border-white/10">
                            <Package className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-sm font-mono">
                              Order #{order.orderId}
                            </h3>
                            <p className="text-zinc-500 text-xs">
                              {new Date(order.orderDate).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePrintPackingSlip(order)}
                            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadAllZip(order)}
                            className="px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-lg text-xs font-medium text-white hover:bg-zinc-700 flex items-center"
                          >
                            <Download className="w-3 h-3 mr-2" /> Download
                            Assets
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-black/20">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {Array.isArray(order.items) &&
                            order.items.map((item: OrderItem, idx: number) => (
                              <div
                                key={idx}
                                className="relative aspect-square bg-checkerboard-dark rounded-lg border border-white/5 overflow-hidden group cursor-zoom-in"
                                onClick={() =>
                                  setPreviewImage(item.printReadyUrl)
                                }
                              >
                                <img
                                  src={item.printReadyUrl}
                                  className="w-full h-full object-contain"
                                  alt=""
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 rounded-xl border border-white/5">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No orders found for this customer.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Detail Modal */}
      {selectedOrder && viewMode === 'orders' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setSelectedOrderId(null)}
          ></div>
          <div className="relative w-full max-w-2xl bg-[#09090b] h-full shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right-full duration-500">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h2 className="text-2xl font-bold text-white font-mono">
                  Order #{selectedOrder.orderId}
                </h2>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded border ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {getNextStatus(selectedOrder.status) && (
              <div className="px-6 py-4 bg-zinc-800/30 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">
                  Quick Action:
                </span>
                <button
                  onClick={() =>
                    updateStatus(
                      selectedOrder.id,
                      getNextStatus(selectedOrder.status)!
                    )
                  }
                  className="flex items-center px-4 py-2 bg-accent text-black font-bold text-sm rounded-lg hover:bg-white shadow-lg"
                >
                  Mark as {getNextStatus(selectedOrder.status)}{' '}
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 builder-scroll">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div className="flex items-center mb-3 text-zinc-400 text-xs font-bold uppercase">
                    <UserIcon className="w-4 h-4 mr-2" /> Customer
                  </div>
                  <p className="text-white font-medium">
                    {selectedOrder.customerName}
                  </p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div className="flex items-center mb-3 text-zinc-400 text-xs font-bold uppercase">
                    <DollarSign className="w-4 h-4 mr-2" /> Payment
                  </div>
                  <p className="text-white font-medium">
                    ${(selectedOrder.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center">
                    <Printer className="w-5 h-5 mr-2 text-primary" /> Production
                    Assets
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrintPackingSlip(selectedOrder)}
                      className="flex items-center px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-zinc-700"
                    >
                      Packing Slip
                    </button>
                    <button
                      onClick={() => handleDownloadAllZip(selectedOrder)}
                      disabled={isZipping}
                      className="flex items-center px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-zinc-700"
                    >
                      {isZipping ? 'Zipping...' : 'Download All (ZIP)'}
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.map((item: OrderItem, idx) => {
                      return (
                        <AssetCard
                          key={idx}
                          item={item}
                          index={idx}
                          onPreview={setPreviewImage}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    )
}

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) {
      return; // Wait for auth and profile to load
    }
    
    if (userProfile?.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      // If not an admin, redirect them after check is complete
      router.push('/dashboard');
    }
    setIsAuthCheckComplete(true);

  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  if (!isAuthCheckComplete) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-zinc-400 mt-4">Verifying credentials...</p>
        </div>
    );
  }

  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400">You do not have permission to view this page. Redirecting...</p>
        </div>
    );
  }

  // Main render for Admins
  return <AdminFulfillmentContent />;
}

    