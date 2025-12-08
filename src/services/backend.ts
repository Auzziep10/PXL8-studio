'use server';

import { isCloudEnabled } from "@/lib/constants";

// This is a mock backend service for demonstration purposes.
// In a real application, this would interact with a database and cloud storage.

async function checkHealth() {
  // Simulate checking database and storage connections
  await new Promise(resolve => setTimeout(resolve, 500));

  if (isCloudEnabled) {
    return {
      db: true,
      storage: true,
      message: "All systems operational.",
      bucketName: "pxl8-production-assets",
    };
  } else {
    return {
      db: true,
      storage: false,
      message: "Local mode. Storage check skipped.",
      bucketName: undefined,
    };
  }
}

export const backend = {
  checkHealth
};
