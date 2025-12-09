'use server';
/**
 * @fileOverview A tool to grant admin privileges to a user.
 *
 * - setAdminRole - A flow that takes a user's email and grants them admin rights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const setAdminRole = ai.defineTool(
  {
    name: 'setAdminRole',
    description: 'Grants admin role to a user by creating a document in the roles_admin collection.',
    inputSchema: z.object({
      email: z.string().email().describe("The email address of the user to make an admin."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      uid: z.string().optional(),
    }),
  },
  async ({ email }) => {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const { uid } = userRecord;

      const adminRoleRef = db.collection('roles_admin').doc(uid);

      await adminRoleRef.set({
        isAdmin: true,
        promotedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`Successfully granted admin role to ${email} (UID: ${uid})`);
      return {
        success: true,
        message: `Successfully granted admin role to ${email}.`,
        uid,
      };

    } catch (error: any) {
      console.error('Error setting admin role:', error);
      if (error.code === 'auth/user-not-found') {
        return {
          success: false,
          message: `User with email ${email} not found.`,
        };
      }
      return {
        success: false,
        message: error.message || 'An unexpected error occurred.',
      };
    }
  }
);
