
import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "../types";

// Always use the required initialization format and direct process.env.API_KEY access
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBusinessInsights = async (products: Product[], sales: Sale[]) => {
  try {
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

    // Use ai.models.generateContent directly with the model and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly
    return response.text || "No insights found.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating insights.";
  }
};
