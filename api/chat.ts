import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context, model } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API Key not configured on server environment variables.' });
  }

  const systemPrompt = `You are an intelligent, helpful university AI agent. 
Your goal is to help the user with questions regarding classroom availability, timetables, and general campus room information.

To help you answer accurately, here is the relevant schedule context retrieved from the local database:
${context}

Instructions:
1. Always base your vacancy and schedule answers strictly on the context provided above.
2. Be friendly, conversational, and direct.
3. If the context does not contain enough info or the user asks a general question, answer to the best of your general knowledge but mention the limitations.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/vanshnegi1584-glitch/CLASSROOM-FINDER",
        "X-Title": "Classroom Finder AI Agent"
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3-8b-instruct:free',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data: any = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.status(200).json({ content: data.choices[0].message.content });
    } else {
      if (data.error && data.error.message) {
        return res.status(400).json({ error: data.error.message });
      }
      return res.status(500).json({ error: 'Unable to get response from OpenRouter.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
}
