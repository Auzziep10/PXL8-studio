'use server';

/**
 * @fileOverview Generates layout suggestions for a gang sheet based on uploaded artwork.
 *
 * - generateSheetLayoutSuggestions - A function that generates layout suggestions.
 * - GenerateSheetLayoutSuggestionsInput - The input type for the function.
 * - GenerateSheetLayoutSuggestionsOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSheetLayoutSuggestionsInputSchema = z.object({
  artworkDataUris: z
    .array(z.string())
    .describe(
      'An array of artwork images as data URIs, each must include a MIME type and use Base64 encoding. Expected format: [\'data:<mimetype>;base64,<encoded_data>\', ...].'
    ),
  sheetWidthInches: z.number().describe('The width of the gang sheet in inches.'),
  sheetHeightInches: z.number().describe('The height of the gang sheet in inches.'),
  dpi: z.number().describe('The resolution (DPI) to use for the gang sheet layout.'),
  numSuggestions: z.number().default(3).describe('The number of layout suggestions to generate.'),
});
export type GenerateSheetLayoutSuggestionsInput = z.infer<typeof GenerateSheetLayoutSuggestionsInputSchema>;

const GenerateSheetLayoutSuggestionsOutputSchema = z.object({
  layoutSuggestions: z.array(
    z.object({
      imageDataUri: z
        .string()
        .describe(
          "A data URI containing the generated gang sheet layout image, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
      description: z.string().describe('A description of the layout suggestion.'),
    })
  ).describe('An array of gang sheet layout suggestions.'),
});
export type GenerateSheetLayoutSuggestionsOutput = z.infer<typeof GenerateSheetLayoutSuggestionsOutputSchema>;

export async function generateSheetLayoutSuggestions(
  input: GenerateSheetLayoutSuggestionsInput
): Promise<GenerateSheetLayoutSuggestionsOutput> {
  return generateSheetLayoutSuggestionsFlow(input);
}

const generateSheetLayoutSuggestionsPrompt = ai.definePrompt({
  name: 'generateSheetLayoutSuggestionsPrompt',
  input: {schema: GenerateSheetLayoutSuggestionsInputSchema},
  output: {schema: GenerateSheetLayoutSuggestionsOutputSchema},
  prompt: `You are an AI assistant specialized in generating gang sheet layout suggestions for direct-to-film (DTF) printing, based on uploaded artwork and the specified sheet dimensions and DPI.

  You will receive an array of images, the desired sheet width and height in inches, the DPI (dots per inch), and the number of layout suggestions to generate.  Based on this input, create the requested number of distinct layout suggestions.

  For each layout suggestion, provide a single image representing the entire gang sheet layout, to be printed on a transparent film, as well as a textual description of the layout.

  Here are the individual artwork images (data URIs):
  {{#each artworkDataUris}}
  {{@index}}: {{media url=this}}
  {{/each}}

  Sheet Width (inches): {{{sheetWidthInches}}}
  Sheet Height (inches): {{{sheetHeightInches}}}
  DPI: {{{dpi}}}
  Number of Suggestions: {{{numSuggestions}}}

  Output should be a JSON object that conforms to the following schema:
  ${JSON.stringify(GenerateSheetLayoutSuggestionsOutputSchema.shape, null, 2)}`,
});

const generateSheetLayoutSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateSheetLayoutSuggestionsFlow',
    inputSchema: GenerateSheetLayoutSuggestionsInputSchema,
    outputSchema: GenerateSheetLayoutSuggestionsOutputSchema,
  },
  async input => {
    // Placeholder implementation - replace with actual layout generation logic.
    const layoutSuggestions = [];
    for (let i = 0; i < input.numSuggestions; i++) {
      const {media} = await ai.generate({
        prompt: `Generate a gang sheet layout suggestion.  This is suggestion number ${i + 1}. The layout should contain all of the provided artwork.`, // expanded prompt
        model: 'googleai/imagen-4.0-fast-generate-001',
      });

      if (!media?.url) {
        throw new Error('Failed to generate image from prompt.');
      }

      layoutSuggestions.push({
        imageDataUri: media.url,
        description: `Layout Suggestion #${i + 1}`,
      });
    }

    return {layoutSuggestions};
  }
);
