import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize the Gemini client
// Note: In a production app, this key should be proxied through a backend.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDressImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const model = 'gemini-2.5-flash';

    const prompt = "Analyze this clothing item. Identify the primary category (e.g., Dress, Top, Pants), the dominant color, and the best suited occasion (e.g., Casual, Formal, Party, Work). Return valid JSON.";

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            color: { type: Type.STRING },
            occasion: { type: Type.STRING }
          },
          required: ["category", "color", "occasion"]
        }
      }
    });

    let text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    // Sanitize: Remove markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const result = JSON.parse(text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    // Fallback values if AI fails
    return {
      category: "Uncategorized",
      color: "Unknown",
      occasion: "Casual"
    };
  }
};