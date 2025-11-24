import { GoogleGenAI } from "@google/genai";
import { CPIData } from "../types";

export async function analyzeCPITrends(data: CPIData): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare a concise summary of the data for the model
  const trendSummary = data.points.map(p => 
    `${p.date}: CPI ${p.cpi.toFixed(2)} (Inflation: ${p.inflation.toFixed(2)}%)`
  ).join('\n');

  const categoryBreakdown = Object.entries(data.categories)
    .map(([cat, val]) => `- ${cat}: Index ${val.toFixed(2)}`)
    .join('\n');

  const prompt = `
    You are a senior financial analyst specializing in the Bolivian economy.
    Analyze the following derived CPI (Consumer Price Index) data based on supermarket prices.
    
    Data Source: Hipermaxi Supermarket Prices (Bolivia).
    Base Period: ${data.points[0]?.date}
    Current Period: ${data.lastUpdated}
    
    Trend Data:
    ${trendSummary}
    
    Current Category Indexes (Base=100):
    ${categoryBreakdown}
    
    Please provide a concise market report (max 200 words) covering:
    1. The overall inflation trend.
    2. Which category is driving price changes the most.
    3. A brief sentiment on consumer purchasing power.
    
    Format using Markdown. Use bolding for key figures.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      }
    });
    
    return response.text || "Analysis complete, but no text returned.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to generate AI analysis.");
  }
}