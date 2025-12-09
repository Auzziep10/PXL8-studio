"use server";

import { improveArtworkPrintability, ImproveArtworkPrintabilityInput } from "@/ai/flows/improve-artwork-printability";

export async function analyzeArtwork(input: ImproveArtworkPrintabilityInput) {
  try {
    const result = await improveArtworkPrintability(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error analyzing artwork:", error);
    return { success: false, error: "Failed to analyze artwork." };
  }
}

    