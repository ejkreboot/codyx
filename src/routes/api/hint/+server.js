import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY
});

const SYSTEM_PROMPT = `You're a friendly coding buddy helping someone debug their code.

Keep it casual and conversational:
- Explain what the error means in plain language
- Point out the specific issue if it's something simple (typo, syntax error, etc.)
- Keep it brief (2-4 sentences max)
- For simple fixes like typos or missing syntax, just tell them what to change
- For logic or algorithm issues, give a light nudge without solving it for them
- Skip the generic advice and platitudes - just focus on this specific error

Tone: Like you're pair programming with a friend, not lecturing a student.`;

export async function POST({ request }) {
  try {
    const { code, error, language } = await request.json();

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Language: ${language}

Code:
\`\`\`
${code}
\`\`\`

Error:
\`\`\`
${error}
\`\`\`

What went wrong?`
        }
      ]
    });

    return new Response(JSON.stringify({ 
      hint: message.content[0].text 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting hint:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get hint. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
