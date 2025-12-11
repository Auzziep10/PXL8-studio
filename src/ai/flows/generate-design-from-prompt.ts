
'use server';

/**
 * @fileOverview Generates a logo-style graphic from a set of structured parameters.
 *
 * - generateDesignFromPrompt - A function that generates a logo based on structured inputs.
 * - GenerateDesignFromPromptInput - The input type for the generateDesignFromPrompt function.
 * - GenerateDesignFromPromptOutput - The return type for the generateDesignFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDesignFromPromptInputSchema = z.object({
  subject: z.string().describe('The primary subject of the graphic.'),
  style: z.string().describe('The artistic style of the graphic.'),
  colors: z.string().describe('The desired color palette.'),
  mood: z.string().describe('The overall mood or feeling.'),
});
export type GenerateDesignFromPromptInput = z.infer<typeof GenerateDesignFromPromptInputSchema>;

const GenerateDesignFromPromptOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A data URI containing the generated image, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateDesignFromPromptOutput = z.infer<typeof GenerateDesignFromPromptOutputSchema>;

export async function generateDesignFromPrompt(input: GenerateDesignFromPromptInput): Promise<GenerateDesignFromPromptOutput> {
  return generateDesignFromPromptFlow(input);
}

const generateDesignFromPromptFlow = ai.defineFlow(
  {
    name: 'generateDesignFromPromptFlow',
    inputSchema: GenerateDesignFromPromptInputSchema,
    outputSchema: GenerateDesignFromPromptOutputSchema,
  },
  async input => {
    // Manually construct the prompt string for simplicity and reliability.
    const promptText = `
      Create a high-quality logo-style graphic on a solid lime green background.
      Subject: ${input.subject}
      Style: ${input.style}
      Color Palette: ${input.colors}
      Mood: ${input.mood}

      Use simplified shapes, strong outlines, and clean composition suitable for t-shirt printing and branding.
      The final image MUST have a solid, pure green screen background (#00FF00) for easy removal.
      Avoid detailed backgrounds, clutter, photorealism, or anything not ideal for apparel printing.
      Do NOT include any text in the image.
      Maintain strong silhouettes, smooth edges, and a balanced composition.
    `.trim();

    const {media} = await ai.generate({
      prompt: promptText,
      model: 'googleai/imagen-4.0-fast-generate-001',
      config: {
        numberOfImages: 1, // Explicitly request a single image
      },
    });

    if (!media?.url) {
      throw new Error('Failed to generate image from prompt. The model did not return an image.');
    }

    return {imageDataUri: media.url};
  }
);
