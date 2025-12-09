'use client';
import { cloneElement } from 'react';

export default function AdminLayout({ children, isAdmin }: { children: React.ReactNode, isAdmin?: boolean }) {
  // Pass the isAdmin prop down to the page component
  const childrenWithProps = cloneElement(children as React.ReactElement, { isAdmin });
  return <>{childrenWithProps}</>;
}
