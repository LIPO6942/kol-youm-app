import {z} from 'genkit';

export const GenerateTalla3ChallengeInputSchema = z.object({
  count: z.number().optional().default(5).describe('The number of challenges to generate.'),
});
export type GenerateTalla3ChallengeInput = z.infer<typeof GenerateTalla3ChallengeInputSchema>;


export const Talla3ChallengeSchema = z.object({
  id: z.string().describe('A unique ID for the challenge.'),
  title: z.string().describe("The question or instruction for the ranking challenge, e.g., 'Classez ces inventions de la plus ancienne à la plus récente :'"),
  items: z.array(z.string()).min(4).describe("The list of items to be sorted, already in the correct order. The user will receive them shuffled."),
  category: z.string().describe("The category of the challenge, e.g., 'Histoire', 'Cinéma', 'Sciences'."),
});
export type Talla3Challenge = z.infer<typeof Talla3ChallengeSchema>;

export const GenerateTalla3ChallengeOutputSchema = z.object({
    challenges: z.array(Talla3ChallengeSchema),
});
export type GenerateTalla3ChallengeOutput = z.infer<typeof GenerateTalla3ChallengeOutputSchema>;
