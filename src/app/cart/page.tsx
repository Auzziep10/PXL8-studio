'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Trash2, ShoppingBag, ArrowRight, Lock, RefreshCw, ZoomIn, Tag, Truck, User as UserIcon, MapPin, Mail, Phone, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShippingRate, ShippingAddress, Order, OrderStatus, SheetSize as SheetSizeType, CartItem, OrderItem, ArtworkOnCanvas, SheetCartItem, ServiceCartItem, DynamicSheetCartItem } from '@/lib/types';
import { createCheckoutSession } from '@/services/stripeService';
import { formatCurrency } from '@/lib/utils';
import { getShippingRates } from '@/app/actions';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { useUser, useFirestore, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import QRCode from 'qrcode';
import { uploadFileAndGetURL } from '@/firebase/storage';


interface CheckoutFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    createAccount: boolean;
    password?: string;
}

interface PreviewState {
    url: string | null;
    size: { width: number, height: number } | null;
}

// This function is now responsible for generating the FINAL print-ready image with customer data
export const generateFinalSheetForPrint = async (
    originalSheetUrl: string, // Now takes the URL of the already saved original layout
    sheetConfig: { width: number; height: number },
    orderId: string,
    customerName: string,
    shippingAddress: ShippingAddress,
): Promise<string> => {
    const BASE_DPI = 300;
    const HEADER_HEIGHT_INCHES = 1;
    const HEADER_HEIGHT_PX = HEADER_HEIGHT_INCHES * BASE_DPI;

    // Load the original sheet image
    const sheetImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error("Failed to load original sheet image for print generation", e);
            reject(new Error("Could not load original sheet image."));
        };
        img.src = originalSheetUrl;
    });

    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('No final context');
    finalCanvas.width = sheetConfig.width * BASE_DPI;
    finalCanvas.height = (sheetConfig.height * BASE_DPI) + HEADER_HEIGHT_PX;
    
    // Draw the white header
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, finalCanvas.width, HEADER_HEIGHT_PX);

    // Generate and draw QR Code
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${origin}/admin?orderId=${orderId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { width: HEADER_HEIGHT_PX - 20, margin: 1 });
    const qrImg = new window.Image();
    await new Promise<void>(resolve => {
        qrImg.onload = () => resolve();
        qrImg.src = qrCodeDataUrl;
    });
    finalCtx.drawImage(qrImg, 10, 10);

    // Draw Header Text
    finalCtx.fillStyle = 'black';
    finalCtx.textAlign = 'left';
    finalCtx.textBaseline = 'top';
    const FONT_SIZE_LARGE = BASE_DPI / 4; // approx 75pt
    const FONT_SIZE_MEDIUM = BASE_DPI / 6; // approx 50pt
    const FONT_SIZE_SMALL = BASE_DPI / 8; // approx 37.5pt

    let currentY = 15;
    finalCtx.font = `bold ${FONT_SIZE_LARGE}px Arial`;
    finalCtx.fillText(`Order: ${orderId}`, HEADER_HEIGHT_PX, currentY);
    currentY += FONT_SIZE_LARGE + 15;
    
    finalCtx.font = `bold ${FONT_SIZE_MEDIUM}px Arial`;
    finalCtx.fillText(`To: ${customerName}`, HEADER_HEIGHT_PX, currentY);
    currentY += FONT_SIZE_MEDIUM + 10;
    
    finalCtx.font = `${FONT_SIZE_SMALL}px Arial`;
    const fullAddress = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`;
    finalCtx.fillText(`Ship To: ${fullAddress}`, HEADER_HEIGHT_PX, currentY);
    currentY += FONT_SIZE_SMALL + 15;
    
    finalCtx.fillText(`Sheet Size: ${sheetConfig.width}" x ${sheetConfig.height}"`, HEADER_HEIGHT_PX, currentY);

    // Draw the original sheet image below the header
    finalCtx.drawImage(sheetImg, 0, HEADER_HEIGHT_PX, finalCanvas.width, sheetConfig.height * BASE_DPI);

    return finalCanvas.toDataURL('image/png');
};


export default function CartPage() {
    const { items: cartItems, removeItem, updateItemQuantity, clearCart, setItems: setCartItems } = useCart();
    const { toast } = useToast();
    
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [previewState, setPreviewState] = useState<PreviewState>({ url: null, size: null });
    
    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !currentUser) return null;
        return doc(firestore, 'users', currentUser.uid);
    }, [firestore, currentUser]);

    const { data: userProfile } = useDoc(userDocRef);
    
    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [isTestMode, setIsTestMode] = useState(false);
    const [couponError, setCouponError] = useState('');
    
    // Form State initialization
    const [formData, setFormData] = useState<CheckoutFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        createAccount: !currentUser,
        password: ''
    });

    useEffect(() => {
        if (currentUser && userProfile) {
            setFormData(prev => ({
                ...prev,
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                email: currentUser.email || '',
                createAccount: false,
                street: userProfile.address?.street || '',
                city: userProfile.address?.city || '',
                state: userProfile.address?.state || '',
                zip: userProfile.address?.zip || '',
            }));
        } else {
             setFormData(prev => ({
                ...prev,
                createAccount: true,
             }));
        }
    }, [currentUser, userProfile]);

    // Shipping State
    const [availableRates, setAvailableRates] = useState<ShippingRate[]>([]);
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    const [isLoadingRates, setIsLoadingRates] = useState(false);

    const hasPhysicalItems = cartItems.some(i => i.type === 'sheet' || i.type === 'dynamic_sheet');

    const subtotal = cartItems.reduce((acc, item) => {
        if (item.type === 'sheet') {
            return acc + (item.sheetSize.price * item.quantity);
        }
        if (item.type === 'service') {
            return acc + (item.price * item.quantity);
        }
        if (item.type === 'dynamic_sheet') {
            return acc + (item.price * item.quantity);
        }
        return acc;
    }, 0);
    const tax = subtotal * 0.08; // 8% tax mock
    
    // Calculate selected shipping cost
    const selectedRate = availableRates.find(r => r.id === selectedRateId);
    let shippingCost = selectedRate ? selectedRate.rate : 0;
    
    // If test mode is active, total is 0
    let total = subtotal + tax + shippingCost;
    if (isTestMode) {
        total = 0;
    }

    // Effect: Trigger rate fetch when Zip code is valid (5 digits)
    useEffect(() => {
        if (formData.zip.length >= 5 && formData.state && formData.city && hasPhysicalItems) {
            fetchRates();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.zip, formData.city, formData.state, cartItems, hasPhysicalItems]);

    const fetchRates = async () => {
        setIsLoadingRates(true);
        setAvailableRates([]);
        
        const physicalItems = cartItems.filter(item => item.type === 'sheet' || item.type === 'dynamic_sheet');
        const totalPhysicalItems = physicalItems.reduce((acc, item) => acc + item.quantity, 0);
        const weightOz = totalPhysicalItems * 3; // Only physical items contribute to weight

        if (weightOz === 0) {
            setIsLoadingRates(false);
            return; // No need to fetch rates if there's nothing to ship
        }

        const address: ShippingAddress = {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: 'US'
        };

        try {
            const result = await getShippingRates(address, weightOz);
            if (result.success && result.data) {
                setAvailableRates(result.data);
                if (result.data.length > 0) {
                    const cheapest = result.data.reduce((prev, curr) => prev.rate < curr.rate ? prev : curr);
                    setSelectedRateId(cheapest.id);
                }
            } else {
                 throw new Error(result.error || "Failed to fetch rates");
            }
           
        } catch (error) {
            console.error("Failed to fetch rates", error);
        } finally {
            setIsLoadingRates(false);
        }
    };

    const handleApplyCoupon = (e: React.FormEvent) => {
        e.preventDefault();
        if (couponCode.toLowerCase().trim() === 'test') {
            setIsTestMode(true);
            setCouponError('');
            toast({ title: 'Test Mode Activated', description: 'Your order total will be $0.00.' });
        } else {
            setIsTestMode(false);
            setCouponError('Invalid coupon code');
            toast({ variant: 'destructive', title: 'Invalid Coupon' });
        }
    };

    const handleRemoveCoupon = () => {
        setIsTestMode(false);
        setCouponCode('');
        setCouponError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCheckoutProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("--- CHECKOUT PROCESS STARTED ---");
        
        if (!firestore || !storage) {
             console.error("Firestore or Storage not available");
             toast({ variant: 'destructive', title: 'Database not available', description: 'Please try again later.' });
             return;
        }

        if (formData.createAccount && !currentUser && !formData.password) {
            console.error("Validation failed: Password required for new account.");
            toast({ variant: 'destructive', title: 'Password required', description: 'Please enter a password to create your account.' });
            return;
        }
        
        if (hasPhysicalItems && !selectedRateId && !isTestMode) {
            console.error("Validation failed: Shipping method required.");
            toast({ variant: 'destructive', title: 'Shipping method required', description: 'Please select a shipping method.' });
            return;
        }

        setIsCheckingOut(true);

        try {
            
            // --- Generate New Order ID ---
            console.log("Step 1: Generating Order ID...");
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

            const ordersRef = collection(firestore, 'orders');
            const q = query(ordersRef, where('orderDate', '>=', startOfDay.toISOString()), where('orderDate', '<', endOfDay.toISOString()));
            const todaysOrdersSnapshot = await getDocs(q);
            const dailyOrderCount = todaysOrdersSnapshot.size;

            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const newOrderCount = (dailyOrderCount + 1).toString().padStart(2, '0');
            const orderId = `${year}${month}${day}${newOrderCount}`;
            console.log(`Step 1 Complete. New Order ID: ${orderId}`);
            // --- End Order ID Generation ---

            const customerId = currentUser?.uid || `GUEST-${Date.now()}`;
            
            console.log("Step 2: Processing cart items...");
            const finalOrderItems: OrderItem[] = await Promise.all(
                cartItems.map(async (item: CartItem): Promise<OrderItem> => {
                    console.log(`Processing item ${item.id} of type ${item.type}`);
                    if (item.type === 'service') {
                        console.log(` -> Service item found: ${item.name}`);
                        return {
                            id: item.id,
                            quantity: item.quantity,
                            originalSheetUrl: '', // No image for services
                            printReadyUrl: '',
                            sheetSizeName: item.name,
                            sheetWidth: 0,
                            sheetHeight: 0,
                            sheetPrice: item.price,
                        };
                    }
                    
                    // Handle both SheetCartItem and DynamicSheetCartItem
                    const isDynamic = item.type === 'dynamic_sheet';
                    const sheetWidth = isDynamic ? item.width : item.sheetSize.width;
                    const sheetHeight = isDynamic ? item.height : item.sheetSize.height;
                    const itemName = isDynamic ? item.name : item.sheetSize.name;
                    const itemPrice = isDynamic ? item.price : item.sheetSize.price;

                    console.log(` -> Physical item: ${itemName}`);
            
                    // Upload the original layout and get its URL.
                    console.log(` -> Uploading original sheet for item ${item.id}`);
                    const originalSheetStorageRef = ref(storage, `original-sheets/${orderId}/${item.id}-original.png`);
                    await uploadString(originalSheetStorageRef, item.previewUrl, 'data_url');
                    const originalSheetDownloadURL = await getDownloadURL(originalSheetStorageRef);
                    console.log(` -> Upload complete: ${originalSheetDownloadURL}`);
            
                    return {
                        id: item.id,
                        quantity: item.quantity,
                        originalSheetUrl: originalSheetDownloadURL,
                        printReadyUrl: '', // This will be generated later by admin.
                        sheetSizeName: itemName,
                        sheetWidth,
                        sheetHeight,
                        sheetPrice: itemPrice,
                    };
                })
            );
            console.log("Step 2 Complete. All items processed.", finalOrderItems);
            
            const newOrderData = {
                orderId: orderId,
                customerId: customerId,
                customerName: `${formData.firstName} ${formData.lastName}`,
                orderDate: new Date().toISOString(),
                status: OrderStatus.PENDING,
                items: finalOrderItems,
                total: total,
                shippingAddress: { street: formData.street, city: formData.city, state: formData.state, zip: formData.zip, country: 'US' },
                trackingId: '',
            };
            console.log("Step 3: Preparing to save order to Firestore.", newOrderData);

            const centralOrderDoc = await addDoc(collection(firestore, 'orders'), {
                ...newOrderData,
                createdAt: serverTimestamp()
            });
            console.log(`Step 3a Complete. Saved to central orders collection: ${centralOrderDoc.id}`);

            if (currentUser) {
                console.log("Step 3b: Saving order to user subcollection...");
                await setDoc(doc(firestore, 'users', currentUser.uid, 'orders', centralOrderDoc.id), {
                    ...newOrderData,
                    createdAt: serverTimestamp()
                });
                console.log("Step 3b Complete.");
            }

            console.log("Step 4: Handling payment/finalization...");
            if (!isTestMode) {
                console.log(" -> Real order, creating Stripe session.");
                 const lightweightItems = finalOrderItems.map(item => ({
                    id: item.id,
                    type: item.originalSheetUrl ? (item.sheetWidth > 0 ? 'dynamic_sheet' : 'sheet') : 'service',
                    name: item.sheetSizeName,
                    price: item.sheetPrice,
                    quantity: item.quantity,
                } as CartItem));

                await createCheckoutSession(lightweightItems, total);
            } else {
                console.log(" -> Test order, skipping payment.");
            }
            
            console.log("Step 5: Finalizing UI...");
            toast({ title: 'Order Placed!', description: 'Your order has been successfully submitted.' });
            clearCart();
            console.log("--- CHECKOUT PROCESS SUCCEEDED ---");
            
        } catch (error) {
            console.error("--- CHECKOUT PROCESS FAILED ---", error);
            toast({ variant: 'destructive', title: 'Checkout Failed', description: (error as Error).message || 'There was an issue processing your order.' });
        } finally {
            console.log("--- CHECKOUT FINALLY BLOCK ---");
            setIsCheckingOut(false);
        }
    };
    
    const handlePreview = (item: SheetCartItem | DynamicSheetCartItem) => {
        if (item.previewUrl) {
            const size = item.type === 'sheet' ? item.sheetSize : { width: item.width, height: item.height };
            setPreviewState({ url: item.previewUrl, size: size });
        } else {
            toast({
                variant: 'destructive',
                title: 'Preview Unavailable',
                description: 'The preview for this item could not be loaded.',
            });
        }
    };

    const renderCartItem = (item: CartItem) => {
        if (item.type === 'sheet' || item.type === 'dynamic_sheet') {
            const name = item.type === 'sheet' ? item.sheetSize.name : item.name;
            const width = item.type === 'sheet' ? item.sheetSize.width : item.width;
            const height = item.type === 'sheet' ? item.sheetSize.height : item.height;
            const price = item.type === 'sheet' ? item.sheetSize.price : item.price;
            
            return (
                 <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div 
                        className="w-20 h-20 bg-checkerboard-dark rounded-lg border border-white/10 flex-shrink-0 relative overflow-hidden cursor-zoom-in group"
                        onClick={() => handlePreview(item)}
                    >
                        <Image src={item.previewUrl || '/placeholder.png'} alt={name} fill className="object-contain group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between">
                            <div>
                                <h3 className="font-bold text-white">{name}</h3>
                                <p className="text-xs text-zinc-500">{width}" x {height}"</p>
                            </div>
                            <p className="font-bold text-white">{formatCurrency(price * item.quantity)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                                <Label htmlFor={`quantity-${item.id}`} className="text-xs text-zinc-500">Qty:</Label>
                                <select 
                                    id={`quantity-${item.id}`}
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                                    className="bg-zinc-900 border border-white/10 rounded text-white text-xs py-1 px-2"
                                >
                                    {[1, 2, 3, 4, 5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-400 text-xs">
                                <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        if (item.type === 'service') {
            return (
                 <div key={item.id} className="flex items-center space-x-6 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-lg border border-white/10 flex-shrink-0 flex items-center justify-center">
                        <Wand2 className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <div>
                                <h3 className="font-bold text-white">{item.name}</h3>
                                <p className="text-xs text-zinc-500">One-time fee</p>
                            </div>
                            <p className="font-bold text-white">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-400 text-xs">
                                <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                        </div>
                    </div>
                </div>
            )
        }
        return null;
    }


    if (cartItems.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
                <div className="glass-panel p-12 rounded-3xl text-center border border-white/10 max-w-lg w-full">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="w-10 h-10 text-zinc-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
                    <p className="text-zinc-400 mb-8">Looks like you haven't started building any gang sheets yet.</p>
                    <Button asChild size="lg">
                        <Link href="/build">Start Building</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>
            
            <ImagePreviewModal 
                isOpen={!!previewState.url} 
                onClose={() => setPreviewState({ url: null, size: null })} 
                imageUrl={previewState.url} 
                title="Gang Sheet Preview"
                sheetWidth={previewState.size?.width}
                sheetHeight={previewState.size?.height}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-800/20">
                            <h2 className="text-lg font-bold text-white flex items-center">
                                <ShoppingBag className="w-5 h-5 mr-2 text-primary" />
                                Review Cart ({cartItems.length})
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                             {cartItems.map(renderCartItem)}
                        </div>
                    </div>

                    <form id="checkout-form" onSubmit={handleCheckoutProcess} className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                         <div className="p-6 border-b border-white/10 bg-zinc-800/20">
                            <h2 className="text-lg font-bold text-white flex items-center">
                                <UserIcon className="w-5 h-5 mr-2 text-accent" />
                                Customer Information
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {isUserLoading ? (
                                <div className="h-10 bg-muted rounded-md animate-pulse" />
                            ) : currentUser ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center">
                                    <UserIcon className="w-5 h-5 text-emerald-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Logged in as {currentUser.displayName || currentUser.email}</p>
                                        <p className="text-xs text-zinc-400">Your information has been pre-filled.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 transition-all">
                                    <div className="flex items-start">
                                        <div className="flex h-5 items-center">
                                            <Input
                                                id="createAccount"
                                                name="createAccount"
                                                type="checkbox"
                                                checked={formData.createAccount}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <Label htmlFor="createAccount" className="font-medium text-white">Create an account</Label>
                                            <p className="text-zinc-400">Save your details for faster checkout and access your order history.</p>
                                        </div>
                                    </div>
                                    
                                    {formData.createAccount && (
                                        <div className="mt-4 animate-in fade-in">
                                            <Label className="block text-xs font-medium text-zinc-400 mb-1">Create Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <Input 
                                                    required 
                                                    name="password" 
                                                    value={formData.password || ''} 
                                                    onChange={handleInputChange} 
                                                    type="password" 
                                                    className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-primary focus:border-primary" 
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="block text-xs font-medium text-zinc-400 mb-1">First Name</Label>
                                    <Input required name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" />
                                </div>
                                <div>
                                    <Label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</Label>
                                    <Input required name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="block text-xs font-medium text-zinc-400 mb-1">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <Input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="pl-10" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="block text-xs font-medium text-zinc-400 mb-1">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <Input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="pl-10" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <h3 className="text-white font-bold mb-4 flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-400"/> Shipping Address</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="block text-xs font-medium text-zinc-400 mb-1">Street Address</Label>
                                        <Input required name="street" value={formData.street} onChange={handleInputChange} type="text" placeholder="123 Main St" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                        <div className="col-span-1 md:col-span-3">
                                            <Label className="block text-xs font-medium text-zinc-400 mb-1">City</Label>
                                            <Input required name="city" value={formData.city} onChange={handleInputChange} type="text" />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <Label className="block text-xs font-medium text-zinc-400 mb-1">State</Label>
                                            <Input required name="state" value={formData.state} onChange={handleInputChange} type="text" />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <Label className="block text-xs font-medium text-zinc-400 mb-1">Zip</Label>
                                            <Input required name="zip" value={formData.zip} onChange={handleInputChange} type="text" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                 <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-bold flex items-center"><Truck className="w-4 h-4 mr-2 text-purple-400"/> Shipping Method</h3>
                                    <div className="text-xs text-zinc-500">Powered by EasyPost</div>
                                 </div>

                                 {isLoadingRates ? (
                                     <div className="flex items-center justify-center py-6 space-x-2 text-zinc-400">
                                         <RefreshCw className="w-4 h-4 animate-spin" />
                                         <span>Calculating live rates...</span>
                                     </div>
                                 ) : availableRates.length > 0 ? (
                                     <div className="space-y-3">
                                        {availableRates.map((rate) => (
                                            <Label key={rate.id} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedRateId === rate.id ? 'bg-zinc-800 border-primary' : 'bg-zinc-900/50 border-white/10 hover:border-white/20'}`}>
                                                <div className="flex items-center">
                                                    <Input 
                                                        type="radio" 
                                                        name="shippingMethod"
                                                        value={rate.id}
                                                        checked={selectedRateId === rate.id}
                                                        onChange={() => setSelectedRateId(rate.id)}
                                                        className="h-4 w-4 text-primary focus:ring-primary bg-zinc-700 border-zinc-600"
                                                    />
                                                    <div className="ml-3">
                                                        <span className="block text-sm font-medium text-white">{rate.carrier} {rate.service}</span>
                                                        <span className="block text-xs text-zinc-500">{rate.deliveryDays}</span>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-white">
                                                    {formatCurrency(rate.rate)}
                                                </span>
                                            </Label>
                                        ))}
                                     </div>
                                 ) : hasPhysicalItems ? (
                                     <div className="text-center py-4 text-sm text-zinc-500 bg-zinc-900/50 rounded-lg border border-white/5">
                                         Enter a valid shipping address to see rates.
                                     </div>
                                 ) : (
                                     <div className="text-center py-4 text-sm text-zinc-500 bg-zinc-900/50 rounded-lg border border-white/5">
                                         No items to ship.
                                     </div>
                                 )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-1">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 sticky top-24">
                        
                        <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
                        
                        <div className="space-y-4 mb-6 pb-6 border-b border-white/10 text-sm">
                            <div className="flex justify-between text-zinc-400">
                                <span>Subtotal</span>
                                <span className="text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Tax (Est. 8%)</span>
                                <span className="text-white">{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Shipping</span>
                                <span className="text-white">{shippingCost === 0 && !isTestMode && hasPhysicalItems ? 'Calculated' : formatCurrency(shippingCost)}</span>
                            </div>
                            {isTestMode && (
                                <div className="flex justify-between text-accent font-bold">
                                    <span>Discount (TEST)</span>
                                    <span>-{formatCurrency(subtotal + tax + shippingCost)}</span>
                                </div>
                            )}
                        </div>

                         <div className="mb-6">
                            {!isTestMode ? (
                                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <Tag className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                                        <Input 
                                            type="text" 
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            placeholder="Discount Code"
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button type="submit" variant="secondary">
                                        Apply
                                    </Button>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between bg-accent/10 border border-accent/20 p-2 rounded-lg">
                                    <span className="text-xs text-accent font-bold flex items-center">
                                        <Tag className="w-3 h-3 mr-1" /> Code Applied: TEST
                                    </span>
                                    <Button onClick={handleRemoveCoupon} variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                 </div>
                            )}
                            {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                        </div>

                        <div className="flex justify-between items-center mb-8">
                            <span className="text-lg font-bold text-white">Total</span>
                            <span className="text-2xl font-bold text-white">{formatCurrency(total)}</span>
                        </div>

                        <Button 
                            type="submit"
                            form="checkout-form"
                            disabled={isCheckingOut || (hasPhysicalItems && !selectedRateId && !isTestMode)}
                            size="lg"
                            className="w-full text-lg"
                        >
                            {isCheckingOut ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin mr-2"/>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isTestMode ? 'Place Order (Test)' : 'Place Order'}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </>
                            )}
                        </Button>
                        
                        <div className="mt-4 flex items-center justify-center text-xs text-zinc-500">
                            <Lock className="w-3 h-3 mr-1 text-zinc-400" />
                            Secure SSL Encryption
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
