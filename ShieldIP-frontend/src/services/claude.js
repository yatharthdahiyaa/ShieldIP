import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAqbT94d9afcgGf8h11ZBA7ToDIBxXaZY0';

// Create Gemini client
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

/**
 * Analyzes a given content violation using Gemini.
 */
export async function analyzeViolation(violation) {
  if (!model) {
    console.warn("No Gemini API Key found. Returning mocked response.");
    return mockAnalysis(violation);
  }

  try {
    const prompt = `You are an IP piracy analyst. Given a content violation report, analyze: match confidence, platform risk, propagation pattern, and audience reach. Return a JSON object with: 
- threat_level (low/medium/high/critical)
- reasoning (2 sentences)
- recommended_action (takedown/monetize/monitor/legal)
- estimated_revenue_loss (USD range, e.g., "$1,000 - $5,000")

Report details:
Platform: ${violation.platform}
Match Confidence: ${violation.confidence}%
Region: ${violation.region}
URL: ${violation.url}

Strictly return ONLY the JSON object.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const contentText = response.text();
    
    // Attempt to extract JSON from the text
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse JSON from Gemini response");
  } catch (error) {
    console.error("Gemini API error:", error);
    return mockAnalysis(violation, true);
  }
}

/**
 * Generates an enforcement notice.
 */
export async function generateDMCA(violation) {
  if (!model) {
    return `[MOCK] This serves as official notice that the content at ${violation.url} infringes upon registered IP. We demand immediate removal of this unauthorized material from ${violation.platform}. Ensure prompt compliance to avoid further legal action.`;
  }

  try {
    const prompt = `You are a legal AI assistant. Draft a strict 3-sentence DMCA takedown notice targeting the provided platform and URL. Do not include placeholders, use fake reasonable names if needed.
    
Platform: ${violation.platform}
URL: ${violation.url}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    return `[FALLBACK] Formal takedown request for content at ${violation.url} on ${violation.platform}. The material violates our verified intellectual property rights. Prompt removal is legally required.`;
  }
}

function mockAnalysis(violation, isError = false) {
  const levels = ["low", "medium", "high", "critical"];
  const actions = ["takedown", "monetize", "monitor", "legal"];
  
  let level = "high";
  if (violation.confidence > 98) level = "critical";
  else if (violation.confidence < 60) level = "low";

  return {
    threat_level: level,
    reasoning: isError 
      ? "Fallback active due to API error. The confidence level suggests an infringement worth reviewing."
      : `High confidence match (${violation.confidence}%) detected on ${violation.platform}. The propagation risk in ${violation.region} necessitates prompt review.`,
    recommended_action: level === "critical" ? "legal" : level === "high" ? "takedown" : "monitor",
    estimated_revenue_loss: "$5,000 - $10,000"
  };
}
