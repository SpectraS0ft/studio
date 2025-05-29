'use server';

/**
 * @fileOverview A flow for analyzing the nutritional content of food.
 *
 * - analyzeFoodNutritionalContent - A function that handles the nutritional analysis process.
 * - AnalyzeFoodNutritionalContentInput - The input type for the analyzeFoodNutritionalContent function.
 * - AnalyzeFoodNutritionalContentOutput - The return type for the analyzeFoodNutritionalContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFoodNutritionalContentInputSchema = z.object({
  foodDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of the food, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  foodDescription: z.string().optional().describe('The description of the food.'),
});
export type AnalyzeFoodNutritionalContentInput = z.infer<
  typeof AnalyzeFoodNutritionalContentInputSchema
>;

const AnalyzeFoodNutritionalContentOutputSchema = z.object({
  calories: z.number().describe('The estimated number of calories in the food.'),
  protein: z.number().describe('The estimated amount of protein in grams.'),
  fat: z.number().describe('The estimated amount of fat in grams.'),
  carbohydrates: z.number().describe('The estimated amount of carbohydrates in grams.'),
  vitamins: z
    .string()
    .describe('A list of vitamins and their estimated amounts.'),
  minerals: z
    .string()
    .describe('A list of minerals and their estimated amounts.'),
  portionSize: z
    .string()
    .describe('The estimated portion size for the nutritional information.'),
});
export type AnalyzeFoodNutritionalContentOutput = z.infer<
  typeof AnalyzeFoodNutritionalContentOutputSchema
>;

export async function analyzeFoodNutritionalContent(
  input: AnalyzeFoodNutritionalContentInput
): Promise<AnalyzeFoodNutritionalContentOutput> {
  return analyzeFoodNutritionalContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeFoodNutritionalContentPrompt',
  input: {schema: AnalyzeFoodNutritionalContentInputSchema},
  output: {schema: AnalyzeFoodNutritionalContentOutputSchema},
  prompt: `You are a nutritional expert. You will analyze the provided information about a food item and estimate its nutritional content.

  Consider the following information:

  Description: {{{foodDescription}}}
  {{#if foodDataUri}}
  Photo: {{media url=foodDataUri}}
  {{/if}}

  Please provide estimates for the following:
  - Calories
  - Protein (grams)
  - Fat (grams)
  - Carbohydrates (grams)
  - Vitamins (list and amounts)
  - Minerals (list and amounts)
  - Portion Size

  Ensure the output is an accurate estimation of the nutritional content based on the available information.
`,
});

const analyzeFoodNutritionalContentFlow = ai.defineFlow(
  {
    name: 'analyzeFoodNutritionalContentFlow',
    inputSchema: AnalyzeFoodNutritionalContentInputSchema,
    outputSchema: AnalyzeFoodNutritionalContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
