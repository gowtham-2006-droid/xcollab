import type { NextApiRequest, NextApiResponse } from "next";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { idea, team = [] } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "Missing OPENAI_API_KEY in .env.local" });

  const prompt = `
You are an expert hackathon mentor. Write a detailed but concise project proposal based on this idea:

Idea: ${idea}

Include:
1. Problem Statement
2. Proposed Solution
3. Tech Stack
4. Implementation Plan
5. Expected Impact

Team: ${JSON.stringify(team)}
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
        max_tokens: 600,
      }),
    });

    // read full response text for debugging
    const raw = await r.text();

    // log details in terminal
    console.log("OpenAI response status:", r.status);
    console.log("Raw body:", raw.slice(0, 300));

    if (!r.ok) {
      return res.status(r.status).json({
        error: "OpenAI API error",
        status: r.status,
        body: raw,
      });
    }

    // try parsing JSON
    const data = JSON.parse(raw);
    const proposalText = data.choices?.[0]?.message?.content?.trim();

    if (!proposalText)
      return res.status(500).json({ error: "No content returned from OpenAI", data });

    res.status(200).json({ proposal: proposalText });
  } catch (err: any) {
    console.error("Proposal API error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch from OpenAI", detail: String(err) });
  }
}
