'use server';

/**
 * @fileOverview AI-powered keyword and tag suggestion flow for artwork categorization.
 *
 * - suggestKeywordsAndTags - A function that suggests keywords and tags for artwork.
 * - SuggestKeywordsAndTagsInput - The input type for the suggestKeywordsAndTags function.
 * - SuggestKeywordsAndTagsOutput - The return type for the suggestKeywordsAndTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestKeywordsAndTagsInputSchema = z.object({
  artworkDataUri: z
    .string()
    .describe(
      "A photo of the artwork as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  artworkDescription: z.string().describe('A description of the artwork.'),
});
export type SuggestKeywordsAndTagsInput = z.infer<typeof SuggestKeywordsAndTagsInputSchema>;

const SuggestKeywordsAndTagsOutputSchema = z.object({
  keywords: z.array(z.string()).describe('A list of keywords relevant to the artwork.'),
  tags: z.array(z.string()).describe('A list of tags relevant to the artwork.'),
});
export type SuggestKeywordsAndTagsOutput = z.infer<typeof SuggestKeywordsAndTagsOutputSchema>;

export async function suggestKeywordsAndTags(
  input: SuggestKeywordsAndTagsInput
): Promise<SuggestKeywordsAndTagsOutput> {
  return suggestKeywordsAndTagsFlow(input);
}

const suggestKeywordsAndTagsPrompt = ai.definePrompt({
  name: 'suggestKeywordsAndTagsPrompt',
  input: {schema: SuggestKeywordsAndTagsInputSchema},
  output: {schema: SuggestKeywordsAndTagsOutputSchema},
  prompt: `You are an AI assistant specialized in suggesting keywords and tags for artwork.

Analyze the artwork provided and suggest relevant keywords and tags for better product categorization and searchability.

Description of the artwork: {{{artworkDescription}}}
Artwork: {{media url=artworkDataUri}}

Provide a list of keywords and a list of tags that accurately describe the artwork.

Output should be a JSON object that conforms to the following schema:
${JSON.stringify(SuggestKeywordsAndTagsOutputSchema.shape, null, 2)}`,
});

const suggestKeywordsAndTagsFlow = ai.defineFlow(
  {
    name: 'suggestKeywordsAndTagsFlow',
    inputSchema: SuggestKeywordsAndTagsInputSchema,
    outputSchema: SuggestKeywordsAndTagsOutputSchema,
  },
  async input => {
    const {output} = await suggestKeywordsAndTagsPrompt(input);
    return output!;
  }
);
