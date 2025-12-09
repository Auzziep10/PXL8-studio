'use client';
import { cloneElement } from 'react';

export default function AdminLayout({ children, isAdmin, isProfileLoading }: { children: React.ReactNode, isAdmin?: boolean, isProfileLoading?: boolean }) {
  // Pass the isAdmin and isProfileLoading props down to the page component
  const childrenWithProps = cloneElement(children as React.ReactElement, { isAdmin, isProfileLoading });
  return <>{childrenWithProps}</>;
}
