
import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "../types";
import { CONFIG, hasGeminiKey } from "./config";

export const getBusinessInsights = async (products: Product[], sales: Sale[]) => {
  // Graceful exit if hosting environment lacks the API key
  if (!hasGeminiKey) {
    console.warn("Gemini AI: API key is not configured in this environment.");
    return "AI Insights are currently unavailable (Missing API Key).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: CONFIG.API.GEMINI_KEY });
    
    const dataSummary = {
      totalProducts: products.length,
      lowStockCount: products.filter(p => p.stock <= p.lowStockThreshold).length,
      totalSales: sales.length,
      revenue: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    };

    const prompt = `Act as a business consultant for a retail store in South Africa. 
    Analyze the following data summary and provide 3 short, actionable insights:
    Data: ${JSON.stringify(dataSummary)}
    Return the response as a simple list.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights found for the current data set.";
  } catch (error) {
    console.error("Gemini Hosting Error:", error);
    return "The intelligence engine is currently warming up. Please check back shortly.";
  }
};
