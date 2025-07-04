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

const SuggestionLinkSchema = z.object({
    text: z.string().describe('The link text, e.g., "Explorer un film historique".'),
    href: z.string().describe('The URL for the link, e.g., "/tfarrej?genre=Historique".'),
    iconName: z.string().describe('The name of a lucide-react icon, e.g., "Film", "Shirt".'),
});

export const GenerateQuizOutputSchema = z.object({
    title: z.string().describe("The title of the quiz, e.g., \"Quiz d'Histoire & Mythologies\"."),
    questions: z.array(QuizQuestionSchema).length(5).describe('A list of 5 quiz questions.'),
    suggestionLinks: z.array(SuggestionLinkSchema).length(2).describe('A list of 2 suggested links related to the quiz category.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;
