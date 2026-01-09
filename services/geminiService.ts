import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "../types.ts";
import { CONFIG, hasGeminiKey } from "./config.ts";

export const getBusinessInsights = async (products: Product[], sales: Sale[]) => {
  if (!hasGeminiKey) {
    return "AI Insights Unavailable: Missing API Key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: CONFIG.API.GEMINI_KEY });
    
    const dataSummary = {
      inventory: products.map(p => ({ name: p.name, stock: p.stock, threshold: p.lowStockThreshold })),
      salesTotal: sales.reduce((acc, s) => acc + s.totalAmount, 0),
      salesCount: sales.length,
      recentItems: sales.slice(-3).flatMap(s => s.items.map(i => i.productName))
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this South African retail POS data: ${JSON.stringify(dataSummary)}. 
      Provide 3 professional, short business strategy insights. 
      Format: Short bullet points. Use South African context (ZAR).`,
    });

    return response.text || "Insights engine standby.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI consultant is analyzing current market trends. Check back shortly.";
  }
};