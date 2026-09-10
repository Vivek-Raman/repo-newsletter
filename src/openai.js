const API_URL = 'https://api.openai.com/v1/responses';

async function generateNewsletter({ apiKey, model, prompt }) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: prompt, store: false }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API request failed (${response.status}): ${message}`);
  }

  const result = await response.json();
  const outputText = result.output_text || (result.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');

  if (typeof outputText !== 'string' || outputText.trim() === '') {
    throw new Error('OpenAI API returned no text output.');
  }

  return `${outputText.trim()}\n`;
}

module.exports = { generateNewsletter };
