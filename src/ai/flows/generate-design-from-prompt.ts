'use server';

/**
 * @fileOverview Generates a gang sheet layout from a text prompt using AI image generation.
 *
 * - generateDesignFromPrompt - A function that generates a gang sheet layout based on a text prompt.
 * - GenerateDesignFromPromptInput - The input type for the generateDesignFromPrompt function.
 * - GenerateDesignFromPromptOutput - The return type for the generateDesignFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDesignFromPromptInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired gang sheet layout.'),
});
export type GenerateDesignFromPromptInput = z.infer<typeof GenerateDesignFromPromptInputSchema>;

const GenerateDesignFromPromptOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A data URI containing the generated gang sheet image, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateDesignFromPromptOutput = z.infer<typeof GenerateDesignFromPromptOutputSchema>;

export async function generateDesignFromPrompt(input: GenerateDesignFromPromptInput): Promise<GenerateDesignFromPromptOutput> {
  return generateDesignFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDesignFromPromptPrompt',
  input: {schema: GenerateDesignFromPromptInputSchema},
  output: {schema: GenerateDesignFromPromptOutputSchema},
  prompt: `You are an AI assistant specialized in generating initial gang sheet layouts for direct-to-film (DTF) printing, based on user prompts.

  Based on the description, create a single image representing the entire gang sheet layout, to be printed on a transparent film.

  Description: {{{prompt}}}
  `,
});

const generateDesignFromPromptFlow = ai.defineFlow(
  {
    name: 'generateDesignFromPromptFlow',
    inputSchema: GenerateDesignFromPromptInputSchema,
    outputSchema: GenerateDesignFromPromptOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      prompt: input.prompt,
      model: 'googleai/imagen-4.0-fast-generate-001',
    });

    if (!media?.url) {
      throw new Error('Failed to generate image from prompt.');
    }

    return {imageDataUri: media.url};
  }
);
