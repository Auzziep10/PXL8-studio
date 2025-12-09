'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 *
 * @param file The file to upload.
 * @param userId The ID of the user uploading the file.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFileAndGetURL(
  file: File,
  userId: string
): Promise<string> {
  const storage = getStorage();
  // Create a storage reference with a user-specific path and a unique filename
  const storageRef = ref(storage, `users/${userId}/images/${Date.now()}-${file.name}`);

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);

  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}
