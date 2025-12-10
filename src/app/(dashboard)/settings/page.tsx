'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import type { User as AppUser, ShippingAddress } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  country: z.string().min(2, 'Country is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type AddressFormData = z.infer<typeof addressSchema>;

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfileForm, formState: { errors: profileErrors, isSubmitting: isSubmittingProfile } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const { register: registerAddress, handleSubmit: handleAddressSubmit, reset: resetAddressForm, formState: { errors: addressErrors, isSubmitting: isSubmittingAddress } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  useEffect(() => {
    if (userProfile) {
      resetProfileForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
      });
      resetAddressForm({
        street: userProfile.address?.street || '',
        city: userProfile.address?.city || '',
        state: userProfile.address?.state || '',
        zip: userProfile.address?.zip || '',
        country: userProfile.address?.country || 'US',
      });
    }
  }, [userProfile, resetProfileForm, resetAddressForm]);

  const onProfileSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    if (!user || !userDocRef) return;
    try {
      if (user.displayName !== `${data.firstName} ${data.lastName}`) {
          await updateProfile(user, { displayName: `${data.firstName} ${data.lastName}` });
      }
      if (user.email !== data.email) {
          toast({ title: "Re-authentication needed", description: "To change your email, please first re-enter your password in the 'Change Password' section." });
          return;
      }

      await updateDoc(userDocRef, {
        firstName: data.firstName,
        lastName: data.lastName,
      });

      toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormData> = async (data) => {
    if (!user || !user.email) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      
      resetPasswordForm();
      toast({ title: 'Success', description: 'Your password has been changed.' });
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to change password. Please check your current password and try again.' });
    }
  };
  
  const onAddressSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!user || !userDocRef) return;
    try {
        const addressData: ShippingAddress = {
            street: data.street,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
        };
        await updateDoc(userDocRef, { address: addressData });
        toast({ title: 'Success', description: 'Your default address has been saved.' });
    } catch (error: any) {
        console.error("Address update error:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...registerProfile('firstName')} />
                {profileErrors.firstName && <p className="text-red-500 text-xs mt-1">{profileErrors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...registerProfile('lastName')} />
                {profileErrors.lastName && <p className="text-red-500 text-xs mt-1">{profileErrors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...registerProfile('email')} />
              {profileErrors.email && <p className="text-red-500 text-xs mt-1">{profileErrors.email.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingProfile}>
                {isSubmittingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
              {passwordErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>}
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
              {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Default Shipping Address</CardTitle>
          <CardDescription>This address will be auto-filled at checkout.</CardDescription>
        </CardHeader>
        <CardContent>
           <form onSubmit={handleAddressSubmit(onAddressSubmit)} className="space-y-4">
                <div>
                    <Label htmlFor="street">Street Address</Label>
                    <Input id="street" {...registerAddress('street')} />
                    {addressErrors.street && <p className="text-red-500 text-xs mt-1">{addressErrors.street.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input id="city" {...registerAddress('city')} />
                        {addressErrors.city && <p className="text-red-500 text-xs mt-1">{addressErrors.city.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="state">State / Province</Label>
                        <Input id="state" {...registerAddress('state')} />
                         {addressErrors.state && <p className="text-red-500 text-xs mt-1">{addressErrors.state.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="zip">ZIP / Postal Code</Label>
                        <Input id="zip" {...registerAddress('zip')} />
                        {addressErrors.zip && <p className="text-red-500 text-xs mt-1">{addressErrors.zip.message}</p>}
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingAddress}>
                        {isSubmittingAddress ? 'Saving...' : 'Save Address'}
                    </Button>
                </div>
           </form>
        </CardContent>
      </Card>
    </div>
  );
}
