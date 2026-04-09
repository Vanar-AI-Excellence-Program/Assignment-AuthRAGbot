import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { retrieveRelevantChunks, retrieveChunksByFilename, buildContextPrompt } from "$lib/server/rag";

// Cache quota errors for 60s to avoid wasting API calls
let quotaBlockedUntil = 0;

function isQuotaError(err: any): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  const status = err?.status ?? err?.statusCode ?? 0;
  return (
    status === 429 ||
    status === 403 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted") ||
    msg.includes("billing") ||
    msg.includes("exceeded") ||
    msg.includes("token limit")
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages: rawMessages, attachedFileName = null } = await request.json();

  // Limit conversation history to last 20 messages to reduce memory/token usage
  const messages = rawMessages.slice(-20);

  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey)
    return new Response("Gemini API key not configured", { status: 503 });
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google("gemini-2.5-flash");

  // RAG: Retrieve relevant context from uploaded documents
  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  let ragContext = "";
  let citations: Array<{
    documentId: string;
    filename: string;
    chunkId: string;
    chunkIndex: number;
    snippet: string;
    similarity: number;
  }> = [];

  if (lastUserMessage) {
    try {
      let relevantChunks;
      const userId = session.user.id!;
      if (attachedFileName) {
        // File is attached — retrieve from that specific document (no threshold, user explicitly attached it)
        relevantChunks = await retrieveChunksByFilename(lastUserMessage.content, attachedFileName, userId, 5);
      } else {
        // Build a richer search query using recent conversation context
        // This helps follow-up questions like "tell me more about the document"
        const recentMessages = messages.slice(-6); // last 3 exchanges
        const searchQuery = recentMessages
          .map((m: { role: string; content: string }) => m.content)
          .join(" ")
          .slice(-500); // cap length for embedding
        relevantChunks = await retrieveRelevantChunks(searchQuery, userId, 5, 0.3);
      }
      if (relevantChunks.length > 0) {
        ragContext = buildContextPrompt(relevantChunks);
        citations = relevantChunks.map((c) => ({
          documentId: c.documentId,
          filename: c.filename,
          chunkId: c.id,
          chunkIndex: c.chunkIndex,
          snippet: c.content.slice(0, 200),
          similarity: Number(c.similarity)
        }));
      }
    } catch (err) {
      console.error("RAG retrieval error (continuing without context):", err);
    }
  }

  const systemPrompt = `You are Pascal, a warm and friendly AI assistant. Use emojis occasionally to keep things lively (👋, ✨, 💡, ✅, 🚀) but don't overuse them. Be conversational, encouraging, and helpful.

Keep responses short and to the point. Prefer 2-4 sentences for simple questions. Only give longer responses when the user asks for detail or the topic requires it. Get to the answer fast — no filler, no preamble.

Formatting rules:
- Use Markdown: **bold** for emphasis, bullet lists for multiple points, \`inline code\` for technical terms.
- Code blocks MUST have a language tag (e.g. \`\`\`python). Never use bare \`\`\`. Use \`\`\`plaintext if unsure. Keep code lines under 60 chars.
- Tables: max 3-4 columns, short cell values. Always add a brief summary after a table.
- Use headings only for longer multi-section responses.
- Never wrap an entire response in a code block.${ragContext}`;

  // Check if we recently hit a quota error — avoid wasting requests
  if (quotaBlockedUntil > Date.now()) {
    return new Response("TOKEN_BUDGET_EXHAUSTED", { status: 429 });
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      let fullResponse = "";

      for await (const chunk of result.textStream) {
        const bytes = encoder.encode(chunk);
        await writer.write(bytes);
        fullResponse += chunk;
      }

      // Empty response usually means a silent quota/API failure
      if (!fullResponse.trim()) {
        quotaBlockedUntil = Date.now() + 60_000;
        await writer.write(
          encoder.encode("\n\n<!--ERROR:TOKEN_BUDGET_EXHAUSTED-->")
        );
      } else if (citations.length > 0) {
        // Append citations if chunks were retrieved and the response references
        // the source content
        const usedSources = /\[Source \d+\]/.test(fullResponse);
        const referencedContent = citations.some((c) => {
          const keywords = c.snippet.split(/\s+/).filter((w) => w.length > 5).slice(0, 5);
          return keywords.some((kw) => fullResponse.toLowerCase().includes(kw.toLowerCase()));
        });

        if (usedSources || referencedContent) {
          await writer.write(
            encoder.encode(`\n\n<!--CITATIONS:${JSON.stringify(citations)}-->`)
          );
        }
      }
    } catch (err: any) {
      console.error("Stream error:", err);

      try {
        if (isQuotaError(err)) {
          quotaBlockedUntil = Date.now() + 60_000;
          await writer.write(
            encoder.encode("\n\n<!--ERROR:TOKEN_BUDGET_EXHAUSTED-->")
          );
        } else {
          await writer.write(
            encoder.encode("\n\n<!--ERROR:STREAM_FAILED-->")
          );
        }
      } catch {
        // Writer may already be closed/errored — ignore
      }
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
};
