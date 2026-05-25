'use server';

import { getAdminFirestore } from '@/lib/firebase/admin';

export async function generateAndSaveTrivia() {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not set.");
      return { success: false, error: "Configuration API manquante." };
    }

    const systemPrompt = `Tu es un assistant expert en culture générale.
Ta tâche est de générer une anecdote insolite, amusante et surtout VÉRIDIQUE qui permet de "dormir moins bête".
Choisis un sujet original et inattendu (science, histoire, espace, culture tunisienne, etc.).
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour. Ne mets pas de bloc markdown de code.
Le format JSON doit être exactement celui-ci :
{
  "title": "Un titre accrocheur",
  "content": "L'explication en 3-4 phrases maximum.",
  "category": "Une catégorie (ex: Histoire, Science, Culture, Gastronomie, Espace, Art)",
  "sourceUrl": "Un lien Wikipédia valide"
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Fast and capable model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une nouvelle anecdote surprenante." }
        ],
        temperature: 0.9,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error:", errorData);
      return { success: false, error: "Erreur lors de la génération (API Groq)." };
    }

    const data = await response.json();
    const contentText = data.choices[0].message.content;
    const aiTrivia = JSON.parse(contentText);
    
    // Abstract aesthetic backgrounds fallback
    const backgroundImages = [
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=600&auto=format&fit=crop',
    ];
    
    let finalImageUrl = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    
    // Tentative de récupération de la vraie image depuis Wikipédia
    try {
      if (aiTrivia.sourceUrl && aiTrivia.sourceUrl.includes('wikipedia.org/wiki/')) {
        const title = aiTrivia.sourceUrl.split('/wiki/').pop();
        if (title) {
          const domainMatch = aiTrivia.sourceUrl.match(/https?:\/\/([a-z]{2,3})\.wikipedia\.org/);
          const lang = domainMatch ? domainMatch[1] : 'fr';
          
          const wikiResponse = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`);
          if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            if (wikiData.thumbnail && wikiData.thumbnail.source) {
              finalImageUrl = wikiData.thumbnail.source;
            }
          }
        }
      }
    } catch (e) {
      console.error("Erreur récupération image Wikipedia:", e);
    }
    
    const db = getAdminFirestore();
    const docRef = db.collection('trivia_ai_generated').doc();
    const savedTrivia = {
      id: docRef.id,
      title: aiTrivia.title,
      content: aiTrivia.content,
      category: aiTrivia.category,
      sourceUrl: aiTrivia.sourceUrl || '',
      imageUrl: finalImageUrl,
      createdAt: Date.now()
    };
    
    await docRef.set(savedTrivia);
    
    return { success: true, trivia: savedTrivia };
  } catch (error) {
    console.error("Error generating trivia with Groq:", error);
    return { success: false, error: "Failed to generate trivia" };
  }
}
