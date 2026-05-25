'use server';

import { getAdminFirestore } from '@/lib/firebase/admin';

export async function getCommunityTriviaAction() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('trivia_ai_generated')
      .orderBy('createdAt', 'desc')
      .get();
      
    const items: any[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    return items;
  } catch (error) {
    console.error("Error fetching community trivia via Admin SDK:", error);
    return [];
  }
}
