
import { GoogleGenAI } from "@google/genai";
import { AppState, Stage } from "../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// System instruction for the AI to understand its role
const SYSTEM_INSTRUCTION = `
You are an expert Microgreens Consultant named "Sprout". 
You assist a small-scale microgreens farmer operating out of a 2x2 meter shed in Europe.
They are also a full-time chef, so they value efficiency, culinary flavor profiles, and profitability.
Currency is Euro (€).

You have access to a specific database of 29 microgreen varieties (including Adzuki, Amaranth, Basil Cinnamon, Sorrel, etc.).
Each crop has defined properties:
- Soak time
- Germination time
- Blackout period
- Light period
- Seeding rate (grams per tray)
- Difficulty

Your capabilities:
1. Diagnose growing issues (mold vs root hairs, leggy crops, yellowing leaves).
2. Create planting schedules based on harvest dates.
3. Suggest crop mixes for chefs/restaurants.
4. Analyze business profitability based on provided data.

When answering:
- Keep answers concise and actionable (the user is busy).
- Use formatting (bullet points) for readability.
- If the user asks about specific crops, refer to their specific data (e.g., "Sorrel needs 7 days blackout").
`;

export const generateAIResponse = async (
  userPrompt: string, 
  contextData: AppState
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return "API Key is missing. Please ensure the API_KEY environment variable is set.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Construct a context-aware prompt
    const stateSummary = `
      Current Farm Status:
      - Active Trays: ${contextData.trays.filter(t => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST).length}
      - Crops Growing: ${[...new Set(contextData.trays.map(t => {
          const crop = contextData.crops.find(c => c.id === t.cropTypeId);
          return crop ? crop.name : 'Unknown';
      }))].join(', ')}
      - Total Revenue Recorded: €${contextData.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)}
      - Customers: ${contextData.customers?.length || 0}
      - Available Varieties in Database: ${contextData.crops.length}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context: ${stateSummary}\n\nUser Query: ${userPrompt}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I couldn't generate a response at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble connecting to the sprout network right now. Please try again later.";
  }
};
