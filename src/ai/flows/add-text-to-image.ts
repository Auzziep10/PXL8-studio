
'use server';

/**
 * @fileOverview Composites text onto a given image.
 *
 * - addTextToImage - A function that takes an image and text, and returns a new image with the text applied.
 * - AddTextToImageInput - The input type for the function.
 * - AddTextToImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AddTextToImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A data URI of the base image, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  text: z.string().describe('The text to be added to the image.'),
});
type AddTextToImageInput = z.infer<typeof AddTextToImageInputSchema>;

const AddTextToImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A data URI containing the new image with the text applied, that must include a MIME type and use Base64 encoding."
    ),
});
type AddTextToImageOutput = z.infer<typeof AddTextToImageOutputSchema>;

export async function addTextToImage(input: AddTextToImageInput): Promise<AddTextToImageOutput> {
  return addTextToImageFlow(input);
}

const addTextToImageFlow = ai.defineFlow(
  {
    name: 'addTextToImageFlow',
    inputSchema: AddTextToImageInputSchema,
    outputSchema: AddTextToImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { text: `Add the following text to this image: "${input.text}". The text should be clearly visible, well-placed, and stylistically match the image.` },
        { media: { url: input.imageDataUri } },
      ],
      config: {
        responseModalities: ['IMAGE'], // We only need the image back
      },
    });

    if (!media?.url) {
      throw new Error('Failed to add text to the image. The model did not return an image.');
    }

    return { imageDataUri: media.url };
  }
);

