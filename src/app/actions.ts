'use server';

import { improveArtworkPrintability, ImproveArtworkPrintabilityInput } from '@/ai/flows/improve-artwork-printability';
import { generateDesignFromPrompt, GenerateDesignFromPromptInput } from '@/ai/flows/generate-design-from-prompt';


export async function analyzeArtwork(input: ImproveArtworkPrintabilityInput) {
  try {
    const result = await improveArtworkPrintability(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error analyzing artwork:', error);
    return { success: false, error: 'Failed to analyze artwork.' };
  }
}

export async function generateDesign(input: GenerateDesignFromPromptInput) {
    try {
        const result = await generateDesignFromPrompt(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error generating design:', error);
        return { success: false, error: 'Failed to generate design.' };
    }
}
