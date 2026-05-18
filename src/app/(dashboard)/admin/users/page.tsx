'use client';

import React, { useState } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function UsersPage() {
  const firestore = useFirestore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!firestore) return;
    try {
      setUpdatingId(userId);
      await updateDoc(doc(firestore, 'users', userId), {
        role: newRole
      });
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const allUsers = users || [];
  const customers = allUsers.filter(u => u.role === 'customer' || !u.role);
  const staff = allUsers.filter(u => u.role === 'admin' || u.role === 'printer');

  const UserTable = ({ data }: { data: User[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              {user.firstName} {user.lastName}
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Select
                disabled={updatingId === user.id}
                value={user.role || 'customer'}
                onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="printer">Printer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
              No users found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage accounts and roles across the platform.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All Users <Badge variant="secondary" className="ml-2">{allUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="customers">
            Customers <Badge variant="secondary" className="ml-2">{customers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="staff">
            Staff & Printers <Badge variant="secondary" className="ml-2">{staff.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>View and manage all registered individuals.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable data={allUsers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Individuals who place orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable data={customers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff & Printers</CardTitle>
              <CardDescription>Team members with administrative or fulfillment access.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable data={staff} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
