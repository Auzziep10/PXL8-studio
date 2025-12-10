'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { SheetSize } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, DollarSign, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

type SheetSizeWithId = SheetSize & { id: string };

const defaultSheetSizes: Omit<SheetSize, 'id'>[] = [
    { name: 'Small', width: 22, height: 24, price: 24.00 },
    { name: 'Medium', width: 22, height: 36, price: 36.00 },
    { name: 'Large', width: 22, height: 60, price: 55.00 },
    { name: 'X-Large', width: 22, height: 120, price: 100.00 },
    { name: 'XX-Large', width: 22, height: 240, price: 180.00 },
];

export default function PricingAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sheetSizesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sheetSizes') : null),
    [firestore]
  );
  const { data: sheetSizes, isLoading } = useCollection<SheetSizeWithId>(sheetSizesQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<SheetSizeWithId | null>(null);
  const [formData, setFormData] = useState({ name: '', width: '', height: '', price: '' });
  const [isSeeding, setIsSeeding] = useState(false);

  // Effect to seed database if it's empty
  useEffect(() => {
    const seedDatabase = async () => {
      if (firestore && !isLoading && sheetSizes && sheetSizes.length === 0 && !isSeeding) {
        setIsSeeding(true);
        toast({ title: 'No tiers found.', description: 'Seeding database with default pricing tiers...' });
        try {
          const batch = writeBatch(firestore);
          defaultSheetSizes.forEach(sheet => {
            const docRef = doc(collection(firestore, 'sheetSizes'));
            batch.set(docRef, { ...sheet, createdAt: serverTimestamp() });
          });
          await batch.commit();
          toast({ title: 'Success', description: 'Default tiers have been added.' });
        } catch (error: any) {
          console.error("Failed to seed pricing tiers:", error);
          toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
        } finally {
          setIsSeeding(false);
        }
      }
    };
    seedDatabase();
  }, [firestore, sheetSizes, isLoading, toast, isSeeding]);


  const sortedSheetSizes = useMemo(() => {
    if (!sheetSizes) return [];
    return [...sheetSizes].sort((a, b) => a.width * a.height - b.width * b.height);
  }, [sheetSizes]);

  const handleOpenDialog = (sheet?: SheetSizeWithId) => {
    if (sheet) {
      setEditingSheet(sheet);
      setFormData({
        name: sheet.name,
        width: String(sheet.width),
        height: String(sheet.height),
        price: String(sheet.price),
      });
    } else {
      setEditingSheet(null);
      setFormData({ name: '', width: '', height: '', price: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSheet(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    const sheetData: Omit<SheetSize, 'id'> = {
      name: formData.name,
      width: parseFloat(formData.width),
      height: parseFloat(formData.height),
      price: parseFloat(formData.price),
    };

    if (Object.values(sheetData).some(v => (typeof v === 'number' && isNaN(v)) || v === '')) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please ensure all fields are filled and numeric fields are valid numbers.' });
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
      console.error('Failed to save sheet size:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this pricing tier?')) return;
    try {
      await deleteDoc(doc(firestore, 'sheetSizes', id));
      toast({ title: 'Success', description: 'Pricing tier deleted.' });
    } catch (error: any) {
      console.error('Failed to delete sheet size:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white">Pricing Manager</h1>
            <p className="text-zinc-400 text-sm mt-1">Add, edit, or remove sheet size pricing tiers.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSheet ? 'Edit' : 'Add New'} Pricing Tier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Tier Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleFormChange} placeholder='e.g., Small, Medium, etc.' required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width (in)</Label>
                  <Input id="width" name="width" type="number" step="0.1" value={formData.width} onChange={handleFormChange} required />
                </div>
                <div>
                  <Label htmlFor="height">Height (in)</Label>
                  <Input id="height" name="height" type="number" step="0.1" value={formData.height} onChange={handleFormChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleFormChange} required />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="flex items-center"><Ruler className="mr-2 h-4 w-4"/>Dimensions</TableHead>
              <TableHead className="text-right flex items-center justify-end"><DollarSign className="mr-2 h-4 w-4"/>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || isSeeding ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                  Loading pricing tiers...
                </TableCell>
              </TableRow>
            ) : sortedSheetSizes.length > 0 ? (
              sortedSheetSizes.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-medium text-white">{sheet.name}</TableCell>
                  <TableCell>{sheet.width}" x {sheet.height}"</TableCell>
                  <TableCell className="text-right font-mono text-white">{formatCurrency(sheet.price)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(sheet)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500/70 hover:text-red-500" onClick={() => handleDelete(sheet.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                  No pricing tiers found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
