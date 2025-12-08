'use server';
/**
 * @fileOverview AI-powered artwork improvement flow to ensure optimal print quality.
 *
 * - improveArtworkPrintability - A function that suggests improvements to artwork for better printability.
 * - ImproveArtworkPrintabilityInput - The input type for the improveArtworkPrintability function.
 * - ImproveArtworkPrintabilityOutput - The return type for the improveArtworkPrintability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveArtworkPrintabilityInputSchema = z.object({
  artworkDataUri: z
    .string()
    .describe(
      "A photo of the artwork as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  artworkDescription: z.string().describe('A description of the artwork.'),
});
export type ImproveArtworkPrintabilityInput = z.infer<typeof ImproveArtworkPrintabilityInputSchema>;

const ImproveArtworkPrintabilityOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A data URI containing the improved artwork image, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  printabilityScore: z.number().describe('A score indicating the overall printability of the artwork (0-100).'),
  safetyAssessment: z.string().describe('An assessment of the artwork regarding safety and NSFW content.'),
  suggestedImprovements: z.array(z.string()).describe('A list of suggested improvements to enhance print quality.'),
  feedback: z.string().describe('Textual feedback on the artwork, detailing potential issues and recommendations.'),
});
export type ImproveArtworkPrintabilityOutput = z.infer<typeof ImproveArtworkPrintabilityOutputSchema>;

export async function improveArtworkPrintability(
  input: ImproveArtworkPrintabilityInput
): Promise<ImproveArtworkPrintabilityOutput> {
  return improveArtworkPrintabilityFlow(input);
}

const improveArtworkPrintabilityPrompt = ai.definePrompt({
  name: 'improveArtworkPrintabilityPrompt',
  input: {schema: ImproveArtworkPrintabilityInputSchema},
  output: {schema: ImproveArtworkPrintabilityOutputSchema},
  prompt: `You are an AI artwork enhancement specialist. Analyze the artwork provided and suggest improvements to ensure optimal print quality, automatically attempting to fix common printability issues (e.g., line thickness, color bleed). 

Consider factors such as line thickness, color contrast, resolution, and potential printing issues.

Description of the artwork: {{{artworkDescription}}}
Artwork: {{media url=artworkDataUri}}

Provide a printability score (0-100), a safety assessment, a list of suggested improvements, textual feedback, and the improved image.

Output should be a JSON object that conforms to the following schema:
${JSON.stringify(ImproveArtworkPrintabilityOutputSchema.shape, null, 2)}`,
});

const improveArtworkPrintabilityFlow = ai.defineFlow(
  {
    name: 'improveArtworkPrintabilityFlow',
    inputSchema: ImproveArtworkPrintabilityInputSchema,
    outputSchema: ImproveArtworkPrintabilityOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        {text: improveArtworkPrintabilityPrompt.prompt},
        {media: {url: input.artworkDataUri}},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Failed to generate improved image.');
    }

    const {output} = await improveArtworkPrintabilityPrompt(input);

    return {
      ...output,
      imageDataUri: media.url,
    } as ImproveArtworkPrintabilityOutput;
  }
);
