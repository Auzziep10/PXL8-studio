'use client';

import { useContext } from 'react';
import { FirebaseContext, FirebaseContextState } from '@/firebase/provider';

interface UserState {
  user: FirebaseContextState['user'];
  isUserLoading: FirebaseContextState['isUserLoading'];
  userError: FirebaseContextState['userError'];
}

/**
 * Hook to access just the user authentication state from the Firebase context.
 * Throws an error if used outside of a FirebaseProvider.
 */
export function useUser(): UserState {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }

  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
}
