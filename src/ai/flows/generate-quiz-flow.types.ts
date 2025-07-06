import {z} from 'genkit';

export const GenerateQuizInputSchema = z.object({
  category: z.string().describe('The category of the quiz, e.g., "Histoire & Mythologies", "Sciences & Découvertes".'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).length(4).describe('A list of four possible answers.'),
  answer: z.string().describe('The correct answer, which must be one of the provided options.'),
});

export const GenerateQuizOutputSchema = z.object({
    title: z.string().describe("The title of the quiz, e.g., \"Quiz d'Histoire & Mythologies\"."),
    questions: z.array(QuizQuestionSchema).length(5).describe('A list of 5 quiz questions.'),
    funFact: z.string().optional().describe("Une anecdote amusante, surprenante et utile liée à la catégorie du quiz. Commence par 'Le saviez-vous ?'."),
    funFactUrl: z.string().optional().describe("Une URL valide vers une source fiable (comme Wikipédia) qui donne plus d'informations sur l'anecdote.")
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;
