// pages/api/ai/idea.ts
import type { NextApiRequest, NextApiResponse } from "next";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { track = "General", skills = [], interests = [] } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res
      .status(500)
      .json({ error: "Missing OPENAI_API_KEY on server" });

  // ---- Clear, structured JSON prompt ----
  const prompt = `
You are an expert hackathon mentor. 
Generate exactly 5 creative and feasible project ideas for the hackathon track "${track}".

Each idea must be in valid JSON format inside a JSON array. 
Do NOT include explanations, notes, or markdown — only pure JSON.

Each object must look like this:
{
  "title": "short project title",
  "short_desc": "one-line summary of what it does",
  "stack": ["tech1", "tech2", "tech3"],
  "roadmap": ["step 1", "step 2", "step 3"]
}

Base your ideas on participant skills: ${skills.join(", ")}, and interests: ${interests.join(", ")}.
  `;

  try {
    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "OpenAI API returned error",
        status: r.status,
        body: data,
      });
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content)
      return res.status(500).json({ error: "No content returned from OpenAI" });

    // try parse JSON safely
    try {
      const parsed = JSON.parse(content);
      return res.status(200).json({ output: parsed });
    } catch {
      // if model wrapped JSON in ``` or text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json({ output: parsed });
        } catch {
          return res.status(200).json({ output: content });
        }
      }
      return res.status(200).json({ output: content });
    }
  } catch (err: any) {
    console.error("AI idea error:", err);
    return res.status(500).json({
      error: "Server fetch error to OpenAI",
      detail: String(err),
    });
  }
}
