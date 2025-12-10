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
import { PlusCircle, Edit, Trash2, DollarSign, Ruler, Settings, Box, Sparkles, Upload as UploadIcon, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type SheetSizeWithId = SheetSize & { id: string };
type ServiceAddOnWithId = ServiceAddOn & { id: string };

const defaultSheetSizes: Omit<SheetSize, 'id' | 'price'>[] = [
    { name: 'Small', width: 22, height: 24, usage: 'Builder' },
    { name: 'Medium', width: 22, height: 36, usage: 'Builder' },
    { name: 'Large', width: 22, height: 60, usage: 'Builder' },
    { name: 'X-Large', width: 22, height: 120, usage: 'Builder' },
    { name: 'XX-Large', width: 22, height: 240, usage: 'Builder' },
];

const defaultAddOns: Omit<ServiceAddOn, 'id'>[] = [
    { name: 'AI Design Creation', description: 'Fee for generating one design using the AI studio.', price: 5.00, type: 'one_time_fee' },
    { name: 'Rush Order', description: 'Priority processing and shipping.', price: 25.00, type: 'one_time_fee' },
    { name: 'Price Per Square Inch', description: 'Dynamic price for uploaded custom-sized sheets.', price: 0.12, type: 'per_sq_inch' }
];


export default function PricingAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const builderSizesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'sheetSizes'), where('usage', '==', 'Builder')) : null, [firestore]);
  const addOnsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceAddOns')) : null, [firestore]);

  const { data: builderSizes, isLoading: isLoadingBuilder } = useCollection<SheetSizeWithId>(builderSizesQuery as Query<SheetSizeWithId> | null);
  const { data: serviceAddOns, isLoading: isLoadingAddOns } = useCollection<ServiceAddOnWithId>(addOnsQuery as Query<ServiceAddOnWithId> | null);
  
  const [perSqInchPrice, setPerSqInchPrice] = useState<ServiceAddOnWithId | null>(null);
  const [otherAddOns, setOtherAddOns] = useState<ServiceAddOnWithId[]>([]);
  const [newSqInchPrice, setNewSqInchPrice] = useState('');

  const [isSheetDialogOpen, setIsSheetDialogOpen] = useState(false);
  const [isAddOnDialogOpen, setIsAddOnDialogOpen] = useState(false);
  
  const [editingSheet, setEditingSheet] = useState<SheetSizeWithId | null>(null);
  const [editingAddOn, setEditingAddOn] = useState<ServiceAddOnWithId | null>(null);

  const [sheetFormData, setSheetFormData] = useState({ name: '', width: '', height: '', usage: 'Builder' });
  const [addOnFormData, setAddOnFormData] = useState({ name: '', description: '', price: '' });

  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'Builder' | 'Dynamic' | 'Add-on'>('Builder');

  useEffect(() => {
    if (serviceAddOns) {
        const sqInchItem = serviceAddOns.find(item => item.type === 'per_sq_inch') || null;
        const regularAddOns = serviceAddOns.filter(item => item.type !== 'per_sq_inch');
        setPerSqInchPrice(sqInchItem);
        setOtherAddOns(regularAddOns);
        if (sqInchItem) {
            setNewSqInchPrice(String(sqInchItem.price));
        }
    }
  }, [serviceAddOns]);


  useEffect(() => {
    const seedDatabase = async () => {
      if (firestore && !isLoadingBuilder && builderSizes?.length === 0 && !isLoadingAddOns && serviceAddOns?.length === 0 && !isSeeding) {
        setIsSeeding(true);
        toast({ title: 'No pricing found.', description: 'Seeding database with default values...' });
        try {
          const batch = writeBatch(firestore);
          
          defaultSheetSizes.forEach(sheet => {
            const docRef = doc(collection(firestore, 'sheetSizes'));
            const pricePerSqIn = defaultAddOns.find(a => a.type === 'per_sq_inch')?.price || 0.12;
            const price = sheet.width * sheet.height * pricePerSqIn;
            batch.set(docRef, { ...sheet, price, createdAt: serverTimestamp() });
          });
          
          defaultAddOns.forEach(addOn => {
              const docRef = doc(collection(firestore, 'serviceAddOns'));
              batch.set(docRef, {...addOn, createdAt: serverTimestamp() });
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
  }, [firestore, builderSizes, serviceAddOns, isLoadingBuilder, isLoadingAddOns, toast, isSeeding]);


  const sortedBuilderSizes = useMemo(() => builderSizes ? [...builderSizes].sort((a, b) => a.width * a.height - b.width * b.height) : [], [builderSizes]);
  const sortedAddOns = useMemo(() => otherAddOns ? [...otherAddOns].sort((a, b) => a.price - b.price) : [], [otherAddOns]);


  const handleOpenSheetDialog = (sheet?: SheetSizeWithId) => {
    if (sheet) {
      setEditingSheet(sheet);
      setSheetFormData({
        name: sheet.name,
        width: String(sheet.width),
        height: String(sheet.height),
        usage: sheet.usage || 'Builder',
      });
    } else {
      setEditingSheet(null);
      setSheetFormData({ name: '', width: '', height: '', usage: 'Builder' });
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
        toast({ variant: 'destructive', title: 'Error', description: 'Pricing service not available.' });
        return;
    }

    const width = parseFloat(sheetFormData.width);
    const height = parseFloat(sheetFormData.height);
    const price = width * height * perSqInchPrice.price;

    const sheetData: SheetSize = {
      id: editingSheet?.id || '',
      name: sheetFormData.name,
      width: width,
      height: height,
      price: price,
      usage: 'Builder',
    };

    if (!sheetData.name || isNaN(sheetData.width) || isNaN(sheetData.height)) {
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
        if (!firestore || !perSqInchPrice) return;
        const newPrice = parseFloat(newSqInchPrice);
        if (isNaN(newPrice) || newPrice < 0) {
            toast({ variant: 'destructive', title: 'Invalid Price', description: 'Please enter a valid positive number.' });
            return;
        }

        try {
            const docRef = doc(firestore, 'serviceAddOns', perSqInchPrice.id);
            await updateDoc(docRef, { price: newPrice, updatedAt: serverTimestamp() });
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
                    <TableHead className="flex items-center"><Ruler className="mr-2 h-4 w-4"/>Dimensions</TableHead>
                    <TableHead className="text-right flex items-center justify-end"><DollarSign className="mr-2 h-4 w-4"/>Calculated Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading || isSeeding || isLoadingAddOns ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading tiers...</TableCell></TableRow>
                ) : sizes.length > 0 && perSqInchPrice ? (
                    sizes.map((sheet) => {
                        const calculatedPrice = sheet.width * sheet.height * (perSqInchPrice.price || 0);
                        return (
                            <TableRow key={sheet.id}>
                                <TableCell className="font-medium text-white">{sheet.name}</TableCell>
                                <TableCell>{sheet.width}" x {sheet.height}"</TableCell>
                                <TableCell className="text-right font-mono text-white">{formatCurrency(calculatedPrice)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenSheetDialog(sheet)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500/70 hover:text-red-500" onClick={() => handleDelete(sheet.id, 'sheet')}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">No pricing tiers found. Please set a 'Price Per Square Inch' in Dynamic Pricing first.</TableCell></TableRow>
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

        <Tabs defaultValue="Builder" onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Builder"><Box className="mr-2 h-4 w-4"/>Builder Sheets</TabsTrigger>
                <TabsTrigger value="Dynamic"><DollarSign className="mr-2 h-4 w-4"/>Dynamic Pricing</TabsTrigger>
                <TabsTrigger value="Add-on"><Sparkles className="mr-2 h-4 w-4"/>Service Add-ons</TabsTrigger>
            </TabsList>
            <TabsContent value="Builder" className="mt-6">{renderSheetTable(sortedBuilderSizes, isLoadingBuilder)}</TabsContent>
            
            <TabsContent value="Dynamic" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Price Per Square Inch</CardTitle>
                        <CardDescription>
                            This single value controls the pricing for both uploaded sheets and pre-defined builder sheets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingAddOns || isSeeding ? (
                            <p>Loading setting...</p>
                        ) : perSqInchPrice ? (
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
                        ) : (
                            <p className="text-red-500">Pricing setting not found. Please re-seed the database or add it manually.</p>
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
