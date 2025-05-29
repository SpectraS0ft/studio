
'use server';
/**
 * @fileOverview Identifies food items from an image.
 *
 * - identifyFoodFromImage - A function that handles the food identification process from an image.
 * - IdentifyFoodFromImageInput - The input type for the identifyFoodFromImage function.
 * - IdentifyFoodFromImageOutput - The return type for the identifyFoodFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyFoodFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of food, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  constraints: z
    .string()
    .optional()
    .describe('Any constraints on the food identification, such as food categories or excluded ingredients.'),
});
export type IdentifyFoodFromImageInput = z.infer<typeof IdentifyFoodFromImageInputSchema>;

const IdentifyFoodFromImageOutputSchema = z.object({
  foodItems: z.array(
    z.string().describe('A list of food items identified in the image.')
  ).describe('The food items identified in the image.'),
});
export type IdentifyFoodFromImageOutput = z.infer<typeof IdentifyFoodFromImageOutputSchema>;

export async function identifyFoodFromImage(input: IdentifyFoodFromImageInput): Promise<IdentifyFoodFromImageOutput> {
  return identifyFoodFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyFoodFromImagePrompt',
  input: {schema: IdentifyFoodFromImageInputSchema},
  output: {schema: IdentifyFoodFromImageOutputSchema},
  prompt: `You are an expert food identifier. You will identify the food items in the image provided.

  Constraints: {{{constraints}}}

  Image: {{media url=photoDataUri}}

  Please list all distinct food items visible in the image. If there are multiple instances of the same food (e.g., three apples), try to list each one if they are clearly separate items (e.g., "Apple", "Apple", "Apple").`,
});

const identifyFoodFromImageFlow = ai.defineFlow(
  {
    name: 'identifyFoodFromImageFlow',
    inputSchema: IdentifyFoodFromImageInputSchema,
    outputSchema: IdentifyFoodFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
