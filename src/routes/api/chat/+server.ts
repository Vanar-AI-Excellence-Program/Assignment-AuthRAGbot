import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { retrieveRelevantChunks, retrieveChunksByFilename, buildContextPrompt } from "$lib/server/rag";

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages: rawMessages, attachedFileName = null } = await request.json();

  // Limit conversation history to last 20 messages to reduce memory/token usage
  const messages = rawMessages.slice(-20);

  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
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

  const systemPrompt = `You are a helpful, friendly AI assistant. Follow these formatting rules strictly:

## Response Formatting
- Use proper **Markdown** for all responses.
- Keep responses concise, well-structured, and easy to read.

## Code
- EVERY code block MUST have a language identifier. This is a STRICT requirement with NO exceptions.
- The opening fence MUST always be \`\`\`language — for example: \`\`\`python, \`\`\`javascript, \`\`\`java, \`\`\`cpp, \`\`\`c, \`\`\`html, \`\`\`css, \`\`\`sql, \`\`\`bash, \`\`\`typescript, \`\`\`rust, \`\`\`go, \`\`\`ruby, \`\`\`php, \`\`\`swift, \`\`\`kotlin, \`\`\`yaml, \`\`\`json, \`\`\`xml, \`\`\`markdown, etc.
- NEVER write a bare \`\`\` without a language. If you are unsure of the language, use \`\`\`plaintext.
- For shell/terminal commands, always use \`\`\`bash.
- For configuration files, use the appropriate language: \`\`\`yaml, \`\`\`json, \`\`\`toml, \`\`\`ini, etc.
- For output/logs with no specific language, use \`\`\`bash.
- When the user asks for code in a specific language, write the code in that exact language.
- Use inline \`code\` for short references like variable names, commands, or file paths.
- Add brief comments in code when helpful.
- Keep code lines under 60 characters when possible. Break long lines naturally so they are readable on mobile without horizontal scrolling.

## Tables
- When presenting tabular or comparative data, always use Markdown tables with proper headers and alignment.
- After every table, always include a short summary paragraph that highlights key takeaways or explains the data shown in the table. Never end a response immediately after a table.
- IMPORTANT: Keep tables narrow and mobile-friendly. Maximum 3-4 columns. Use short, concise column headers and cell values.
- If data has more than 4 columns, split into multiple smaller tables or use a list format instead.
- Keep cell content brief — use abbreviations or short phrases, not full sentences inside cells.
- Example format:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | data     | data     | data     |

  As shown above, [brief explanation of the data].

## Lists & Structure
- Use bullet points or numbered lists for steps, options, or enumerations.
- Use headings (##, ###) to organize longer responses into sections.
- Use **bold** for emphasis and key terms.

## General
- Do not wrap entire responses in a code block.
- Respond directly without unnecessary preamble.${ragContext}`;

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  });

  // Create a TransformStream to collect full response and conditionally append citations
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    try {
      const textStream = result.toTextStreamResponse();
      const reader = textStream.body!.getReader();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
        fullResponse += decoder.decode(value, { stream: true });
      }

      // Append citations if chunks were retrieved and the response references
      // the source content (either via [Source N] notation or by using document info)
      if (citations.length > 0) {
        // Check if the LLM used the source content — either explicit citations
        // or if the response contains keywords from the source snippets
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
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
};
