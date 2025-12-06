import { GoogleGenAI } from "@google/genai";

// Initialize AI only if key exists and is not the placeholder
let ai: GoogleGenAI | null = null;
if (process.env.API_KEY && !process.env.API_KEY.includes("paste_your")) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.warn("Gemini API Key missing. AI features will be disabled.");
}

export const generateProductDescription = async (name: string, type: string): Promise<string> => {
  if (!ai) return "AI Description unavailable (Key Missing).";

  try {
    const prompt = `Write a short, elegant, and sales-focused product description (max 30 words) for a piece of imitation/artificial jewelry. 
    Product Name: ${name}
    Type/Category: ${type}
    Do not mention specific materials (like real gold or silver) unless it is gold-plated or silver-oxidized based on the name.
    Do not use markdown. Just plain text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Elegant imitation jewelry piece suitable for any occasion.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Beautifully crafted imitation jewelry.";
  }
};

export const analyzeStockTrends = async (products: any[], distributors: any[]): Promise<string> => {
  if (!ai) return "AI Insights unavailable. Please configure API Key.";

  try {
    const prompt = `Analyze this jewelry business snapshot and give 2 short, actionable sentences of advice.
    - Total Products: ${products.length}
    - Total Distributors: ${distributors.length}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Keep tracking your inventory to ensure distributors are well-stocked.";
  } catch (error) {
    console.error("Error analyzing trends:", error);
    return "Data analysis currently unavailable.";
  }
};