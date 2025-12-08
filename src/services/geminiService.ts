"use server";

import { improveArtworkPrintability } from "@/ai/flows/improve-artwork-printability";

export async function analyzeArtwork(artworkDataUri: string, artworkDescription: string) {
  try {
    const result = await improveArtworkPrintability({ artworkDataUri: `data:${artworkDescription};base64,${artworkDataUri}`, artworkDescription });
    return { success: true, feedback: result.feedback, score: result.printabilityScore };
  } catch (error) {
    console.error("Error analyzing artwork:", error);
    return { success: false, feedback: "Failed to analyze artwork.", score: 0 };
  }
}
