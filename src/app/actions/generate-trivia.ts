'use server';

import { generateTriviaFlow } from '@/ai/flows/generate-trivia-flow';
import { addCommunityTrivia } from '@/lib/firebase/firestore';

export async function generateAndSaveTrivia() {
  try {
    const aiTrivia = await generateTriviaFlow({});
    
    // Abstract aesthetic backgrounds since AI can't generate specific real images reliably
    const backgroundImages = [
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop', // Gradient abstract
      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&auto=format&fit=crop', // Purple abstract
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop', // Colorful abstract
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop', // Liquid abstract
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop', // Geometric abstract
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop', // Space abstract
      'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=600&auto=format&fit=crop', // Space stars
    ];
    
    const randomImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    
    const savedTrivia = await addCommunityTrivia({
      title: aiTrivia.title,
      content: aiTrivia.content,
      category: aiTrivia.category,
      sourceUrl: aiTrivia.sourceUrl,
      imageUrl: randomImage,
    });
    
    return { success: true, trivia: savedTrivia };
  } catch (error) {
    console.error("Error generating trivia:", error);
    return { success: false, error: "Failed to generate trivia" };
  }
}
