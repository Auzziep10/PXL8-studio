'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, query, where, Query } from 'firebase/firestore';
import { SheetSize, ServiceAddOn } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, DollarSign, Ruler, Settings, Box, Sparkles, Upload as UploadIcon, Wand2, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type SheetSizeWithId = SheetSize & { id: string };
type ServiceAddOnWithId = ServiceAddOn & { id: string };

const defaultSheetSizes: Omit<SheetSize, 'id' | 'price'>[] = [
    { name: 'Small', width: 22, height: 24, usage: 'Builder', discount: 0 },
    { name: 'Medium', width: 22, height: 36, usage: 'Builder', discount: 5 },
    { name: 'Large', width: 22, height: 60, usage: 'Builder', discount: 10 },
    { name: 'X-Large', width: 22, height: 120, usage: 'Builder', discount: 15 },
    { name: 'XX-Large', width: 22, height: 240, usage: 'Builder', discount: 20 },
];

const defaultAddOns: Omit<ServiceAddOn, 'id'>[] = [
    { name: 'AI Design Creation', description: 'Fee for generating one design using the AI studio.', price: 5.00, type: 'one_time_fee' },
    { name: 'Rush Order', description: 'Priority processing and shipping.', price: 25.00, type: 'one_time_fee' },
    { name: 'Price Per Square Inch', description: 'Dynamic price for uploaded custom-sized sheets.', price: 0.12, type: 'per_sq_inch' }
];


export default function PricingAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sheetSizesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'sheetSizes')) : null, [firestore]);
  const serviceAddOnsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceAddOns')) : null, [firestore]);

  const { data: allSheetSizes, isLoading: isLoadingSizes } = useCollection<SheetSizeWithId>(sheetSizesQuery as Query<SheetSizeWithId> | null);
  const { data: allServiceAddOns, isLoading: isLoadingAddOns } = useCollection<ServiceAddOnWithId>(serviceAddOnsQuery as Query<ServiceAddOnWithId> | null);

  const [perSqInchPrice, setPerSqInchPrice] = useState<ServiceAddOnWithId | null>(null);
  const [otherAddOns, setOtherAddOns] = useState<ServiceAddOnWithId[]>([]);
  const [builderSizes, setBuilderSizes] = useState<SheetSizeWithId[]>([]);
  const [newSqInchPrice, setNewSqInchPrice] = useState('');

  const [isSheetDialogOpen, setIsSheetDialogOpen] = useState(false);
  const [isAddOnDialogOpen, setIsAddOnDialogOpen] = useState(false);
  
  const [editingSheet, setEditingSheet] = useState<SheetSizeWithId | null>(null);
  const [editingAddOn, setEditingAddOn] = useState<ServiceAddOnWithId | null>(null);

  const [sheetFormData, setSheetFormData] = useState({ name: '', width: '', height: '', discount: '' });
  const [addOnFormData, setAddOnFormData] = useState({ name: '', description: '', price: '' });

  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'Builder' | 'Dynamic' | 'Add-on'>('Builder');

  useEffect(() => {
    if (allServiceAddOns) {
        const sqInchItem = allServiceAddOns.find(item => item.type === 'per_sq_inch') || null;
        const regularAddOns = allServiceAddOns.filter(item => item.type !== 'per_sq_inch');
        setPerSqInchPrice(sqInchItem);
        setOtherAddOns(regularAddOns);
        if (sqInchItem) {
            setNewSqInchPrice(String(sqInchItem.price));
        } else if (!isLoadingAddOns && !isSeeding && !isLoadingSizes) {
            // Auto-switch to Dynamic Pricing tab if not set, after everything has loaded
            if (allSheetSizes?.length === 0 && allServiceAddOns?.length === 0) {
                 setActiveTab('Dynamic');
            }
        }
    }
    if (allSheetSizes) {
        const builderItems = allSheetSizes.filter(s => s.usage === 'Builder');
        setBuilderSizes(builderItems);
    }
  }, [allServiceAddOns, allSheetSizes, isLoadingAddOns, isLoadingSizes, isSeeding]);


  useEffect(() => {
    const seedDatabase = async () => {
      if (firestore && !isLoadingSizes && !isLoadingAddOns && allSheetSizes?.length === 0 && allServiceAddOns?.length === 0 && !isSeeding) {
        setIsSeeding(true);
        toast({ title: 'No pricing found.', description: 'Seeding database with default values...' });
        try {
          const batch = writeBatch(firestore);
          
          // Seed add-ons first
          const pricePerSqIn = defaultAddOns.find(a => a.type === 'per_sq_inch')?.price || 0.12;
          defaultAddOns.forEach(addOn => {
              const docRef = doc(collection(firestore, 'serviceAddOns'));
              batch.set(docRef, {...addOn, createdAt: serverTimestamp() });
          });
          
          // Then seed builder sheets using the default sq inch price
          defaultSheetSizes.forEach(sheet => {
            const docRef = doc(collection(firestore, 'sheetSizes'));
            const basePrice = sheet.width * sheet.height * pricePerSqIn;
            const finalPrice = basePrice - (basePrice * (sheet.discount / 100));
            batch.set(docRef, { ...sheet, price: finalPrice, createdAt: serverTimestamp() });
          });

          await batch.commit();
          toast({ title: 'Success', description: 'Default pricing has been added.' });
        } catch (error: any) {
          console.error("Failed to seed database:", error);
          toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
        } finally {
          setIsSeeding(false);
        }
      }
    };
    seedDatabase();
  }, [firestore, allSheetSizes, allServiceAddOns, isLoadingSizes, isLoadingAddOns, toast, isSeeding]);


  const sortedBuilderSizes = useMemo(() => builderSizes ? [...builderSizes].sort((a, b) => a.width * a.height - b.width * b.height) : [], [builderSizes]);
  const sortedAddOns = useMemo(() => otherAddOns ? [...otherAddOns].sort((a, b) => a.price - b.price) : [], [otherAddOns]);


  const handleOpenSheetDialog = (sheet?: SheetSizeWithId) => {
    if (!perSqInchPrice) {
        toast({ variant: 'destructive', title: 'Action Required', description: "Please set a 'Price Per Square Inch' in Dynamic Pricing first." });
        setActiveTab('Dynamic');
        return;
    }
    if (sheet) {
      setEditingSheet(sheet);
      setSheetFormData({
        name: sheet.name,
        width: String(sheet.width),
        height: String(sheet.height),
        discount: String(sheet.discount || 0),
      });
    } else {
      setEditingSheet(null);
      setSheetFormData({ name: '', width: '', height: '', discount: '0' });
    }
    setIsSheetDialogOpen(true);
  };
  
  const handleOpenAddOnDialog = (addOn?: ServiceAddOnWithId) => {
    if (addOn) {
        setEditingAddOn(addOn);
        setAddOnFormData({
            name: addOn.name,
            description: addOn.description,
            price: String(addOn.price)
        });
    } else {
        setEditingAddOn(null);
        setAddOnFormData({ name: '', description: '', price: '' });
    }
    setIsAddOnDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsSheetDialogOpen(false);
    setIsAddOnDialogOpen(false);
    setEditingSheet(null);
    setEditingAddOn(null);
  };

  const handleSheetFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !perSqInchPrice) {
        toast({ variant: 'destructive', title: 'Error', description: 'Dynamic pricing (price per sq. inch) must be set before adding or editing sheets.' });
        return;
    }

    const width = parseFloat(sheetFormData.width);
    const height = parseFloat(sheetFormData.height);
    const discount = parseFloat(sheetFormData.discount);
    
    const basePrice = width * height * perSqInchPrice.price;
    const finalPrice = basePrice - (basePrice * (discount / 100));

    const sheetData: Omit<SheetSize, 'id'> = {
      name: sheetFormData.name,
      width: width,
      height: height,
      price: finalPrice,
      discount: discount,
      usage: 'Builder',
    };

    if (!sheetData.name || isNaN(sheetData.width) || isNaN(sheetData.height) || isNaN(sheetData.discount)) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields correctly.' });
      return;
    }

    try {
      if (editingSheet) {
        const docRef = doc(firestore, 'sheetSizes', editingSheet.id);
        await updateDoc(docRef, { ...sheetData, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Pricing tier updated.' });
      } else {
        await addDoc(collection(firestore, 'sheetSizes'), { ...sheetData, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'New pricing tier added.' });
      }
      handleCloseDialog();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleAddOnFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!firestore) return;

      const addOnData: Omit<ServiceAddOn, 'id'> = {
          name: addOnFormData.name,
          description: addOnFormData.description,
          price: parseFloat(addOnFormData.price),
          type: 'one_time_fee',
      };
      
      if (!addOnData.name || !addOnData.description || isNaN(addOnData.price)) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields correctly.' });
          return;
      }

      try {
          if (editingAddOn) {
              const docRef = doc(firestore, 'serviceAddOns', editingAddOn.id);
              await updateDoc(docRef, { ...addOnData, updatedAt: serverTimestamp() });
              toast({ title: 'Success', description: 'Add-on updated.' });
          } else {
              await addDoc(collection(firestore, 'serviceAddOns'), { ...addOnData, createdAt: serverTimestamp() });
              toast({ title: 'Success', description: 'New add-on created.' });
          }
          handleCloseDialog();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
  };
  
    const handleUpdateSqInchPrice = async () => {
        if (!firestore) return;
        const newPrice = parseFloat(newSqInchPrice);
        if (isNaN(newPrice) || newPrice < 0) {
            toast({ variant: 'destructive', title: 'Invalid Price', description: 'Please enter a valid positive number.' });
            return;
        }

        try {
            if (perSqInchPrice) {
                const docRef = doc(firestore, 'serviceAddOns', perSqInchPrice.id);
                await updateDoc(docRef, { price: newPrice, updatedAt: serverTimestamp() });
            } else {
                const newAddOn: Omit<ServiceAddOn, 'id'> = {
                    name: 'Price Per Square Inch',
                    description: 'Dynamic price for uploaded custom-sized sheets.',
                    price: newPrice,
                    type: 'per_sq_inch'
                };
                await addDoc(collection(firestore, 'serviceAddOns'), { ...newAddOn, createdAt: serverTimestamp() });
            }
            toast({ title: 'Success', description: 'Price per square inch has been updated.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };


  const handleDelete = async (id: string, type: 'sheet' | 'addOn') => {
    if (!firestore || !window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const collectionName = type === 'sheet' ? 'sheetSizes' : 'serviceAddOns';
      await deleteDoc(doc(firestore, collectionName, id));
      toast({ title: 'Success', description: 'Item deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const renderSheetTable = (sizes: SheetSizeWithId[], isLoading: boolean) => (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead><Ruler className="inline mr-2 h-4 w-4"/>Dimensions</TableHead>
                    <TableHead><Percent className="inline mr-2 h-4 w-4"/>Discount</TableHead>
                    <TableHead className="text-right"><DollarSign className="inline mr-2 h-4 w-4"/>Final Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading || isSeeding || isLoadingAddOns ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading tiers...</TableCell></TableRow>
                ) : sizes.length > 0 && perSqInchPrice ? (
                    sizes.map((sheet) => {
                        const basePrice = sheet.width * sheet.height * (perSqInchPrice.price || 0);
                        const finalPrice = basePrice - (basePrice * ((sheet.discount || 0) / 100));
                        return (
                            <TableRow key={sheet.id}>
                                <TableCell className="font-medium text-white">{sheet.name}</TableCell>
                                <TableCell>{sheet.width}" x {sheet.height}"</TableCell>
                                <TableCell className="font-mono text-accent">{sheet.discount || 0}%</TableCell>
                                <TableCell className="text-right font-mono text-white">
                                    {formatCurrency(finalPrice)}
                                    {sheet.discount > 0 && <span className="text-xs text-zinc-500 line-through ml-2">{formatCurrency(basePrice)}</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenSheetDialog(sheet)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500/70 hover:text-red-500" onClick={() => handleDelete(sheet.id, 'sheet')}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">No pricing tiers found. Please set a 'Price Per Square Inch' in Dynamic Pricing first.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );

  const renderAddOnTable = (addOns: ServiceAddOnWithId[], isLoading: boolean) => (
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {isLoading || isSeeding ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading add-ons...</TableCell></TableRow>
                ) : addOns.length > 0 ? (
                    addOns.map((addOn) => (
                        <TableRow key={addOn.id}>
                            <TableCell className="font-medium text-white">{addOn.name}</TableCell>
                            <TableCell className="text-zinc-400">{addOn.description}</TableCell>
                            <TableCell className="text-right font-mono text-white">{formatCurrency(addOn.price)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenAddOnDialog(addOn)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-red-500/70 hover:text-red-500" onClick={() => handleDelete(addOn.id, 'addOn')}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">No add-ons found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Pricing Manager</h1>
                <p className="text-zinc-400 text-sm mt-1">Manage pricing for sheets and service add-ons.</p>
            </div>
            {activeTab !== 'Dynamic' && (
                <Button onClick={() => activeTab === 'Add-on' ? handleOpenAddOnDialog() : handleOpenSheetDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New
                </Button>
            )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Builder"><Box className="mr-2 h-4 w-4"/>Builder Sheets</TabsTrigger>
                <TabsTrigger value="Dynamic"><DollarSign className="mr-2 h-4 w-4"/>Dynamic Pricing</TabsTrigger>
                <TabsTrigger value="Add-on"><Sparkles className="mr-2 h-4 w-4"/>Service Add-ons</TabsTrigger>
            </TabsList>
            <TabsContent value="Builder" className="mt-6">{renderSheetTable(sortedBuilderSizes, isLoadingSizes)}</TabsContent>
            
            <TabsContent value="Dynamic" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Price Per Square Inch</CardTitle>
                        <CardDescription>
                            This single value is the base for calculating prices for all sheet types. Discounts can be applied per sheet size.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingAddOns || isSeeding ? (
                            <p>Loading setting...</p>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <div className="relative flex-grow">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input 
                                        type="number" 
                                        value={newSqInchPrice}
                                        onChange={e => setNewSqInchPrice(e.target.value)}
                                        step="0.01"
                                        min="0"
                                        className="pl-9"
                                    />
                                </div>
                                <Button onClick={handleUpdateSqInchPrice}>Save Change</Button>
                            </div>
                        )}
                        {!perSqInchPrice && !isLoadingAddOns && !isSeeding && (
                             <p className="mt-4 text-red-500">Pricing setting not found. Please set a price and save.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="Add-on" className="mt-6">{renderAddOnTable(sortedAddOns, isLoadingAddOns)}</TabsContent>
        </Tabs>
        
        {/* Dialog for Sheet Sizes */}
        <Dialog open={isSheetDialogOpen} onOpenChange={setIsSheetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSheet ? 'Edit' : 'Add New'} Sheet Tier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSheetFormSubmit} className="space-y-4">
              <Input name="name" value={sheetFormData.name} onChange={(e) => setSheetFormData({...sheetFormData, name: e.target.value})} placeholder="Tier Name, e.g., Small" required />
              <div className="grid grid-cols-2 gap-4">
                <Input name="width" type="number" value={sheetFormData.width} onChange={(e) => setSheetFormData({...sheetFormData, width: e.target.value})} placeholder="Width (in)" required />
                <Input name="height" type="number" value={sheetFormData.height} onChange={(e) => setSheetFormData({...sheetFormData, height: e.target.value})} placeholder="Height (in)" required />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <Input name="discount" type="number" value={sheetFormData.discount} onChange={(e) => setSheetFormData({...sheetFormData, discount: e.target.value})} placeholder="e.g., 10 for 10%" required />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog for Add-ons */}
        <Dialog open={isAddOnDialogOpen} onOpenChange={setIsAddOnDialogOpen}>
             <DialogContent>
                 <DialogHeader>
                     <DialogTitle>{editingAddOn ? 'Edit' : 'Add New'} Service Add-on</DialogTitle>
                 </DialogHeader>
                 <form onSubmit={handleAddOnFormSubmit} className="space-y-4">
                     <Input name="name" value={addOnFormData.name} onChange={(e) => setAddOnFormData({...addOnFormData, name: e.target.value})} placeholder="Add-on Name, e.g., Rush Order" required />
                     <Textarea name="description" value={addOnFormData.description} onChange={(e) => setAddOnFormData({...addOnFormData, description: e.target.value})} placeholder="Brief description of the service" required />
                     <Input name="price" type="number" value={addOnFormData.price} onChange={(e) => setAddOnFormData({...addOnFormData, price: e.target.value})} placeholder="Price (USD)" required />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit">Save</Button>
                     </DialogFooter>
                 </form>
             </DialogContent>
        </Dialog>

    </div>
  );
}
