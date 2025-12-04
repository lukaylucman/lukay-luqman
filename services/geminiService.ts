import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getScoreCommentary = async (score: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The player just scored ${score} in a Flappy Bird clone game called "Fluppy Bird". 
      Give a very short, funny, sarcastic, or encouraging comment in Indonesian (Bahasa Indonesia). 
      If the score is low (0-5), roast them gently. If it's high (>20), praise them. 
      Keep it under 15 words.`,
    });
    return response.text || "Teruslah berlatih!";
  } catch (error) {
    console.error("AI Error:", error);
    return "Koneksi AI bermasalah, tapi skor kamu mantap!";
  }
};