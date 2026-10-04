const OpenAI = require('openai');
const logger = require('./logger');

if (!process.env.OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY not set, OCR features disabled');
}

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Extract character stats from screenshot using GPT-4o Vision
 * @param {string} imageUrl - Image URL or base64 data URI
 * @param {string} charName - Character name hint (optional)
 * @returns {Promise<Object>} Extracted stats
 */
async function extractStatsFromImage(imageUrl, charName = null) {
  if (!openai) {
    throw new Error('OCR not available: OPENAI_API_KEY not configured');
  }

  logger.info({ charName }, 'Starting OCR extraction');

  const systemPrompt = `You are an OCR assistant for GrandChase Classic game.
Extract character stats from the provided screenshot.

Return ONLY valid JSON (no markdown, no explanation):
{
  "atk": integer (physical attack),
  "atk_sp": integer (special attack),
  "nivel": integer (level 1-90),
  "status_despertar": string ("Despertado" or "Não despertado"),
  "andar_wl": integer (tower floor, if visible),
  "status_anel": string ("Obtido" or "Não obtido", if visible),
  "tipo_anel": string ("Esmaecido" | "Silencioso" | "Sangrento" | "Caos", if visible),
  "status_tornozeleira": string (if visible),
  "tipo_tornozeleira": string ("Eternidade" | "Redenção" | "Perfeição" | "Caos", if visible),
  "status_brinco_caos": string (if visible),
  "status_piercing_caos": string (if visible),
  "confidence": number (0-1, your confidence in extraction)
}

Rules:
- Only include fields you can confidently read
- Use null for unclear/missing fields
- Numbers must be integers (no commas, dots, or text)
- Portuguese labels: "Ataque", "Ataque Especial", "Nível"
- If multiple characters visible, extract the main/centered one`;

  const userPrompt = charName 
    ? `Extract stats for character: ${charName}`
    : 'Extract character stats from this screenshot';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, content];
    const jsonStr = jsonMatch[1] || content;
    
    const extracted = JSON.parse(jsonStr);

    logger.info({ 
      extracted, 
      confidence: extracted.confidence,
      tokens: response.usage.total_tokens 
    }, 'OCR extraction complete');

    return extracted;
  } catch (error) {
    logger.error({ error: error.message }, 'OCR extraction failed');
    throw new Error(`OCR failed: ${error.message}`);
  }
}

module.exports = {
  extractStatsFromImage
};
