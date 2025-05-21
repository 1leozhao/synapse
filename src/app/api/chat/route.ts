import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateFullPaperSummaryFromUrl } from '@/lib/openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for paper content to avoid re-fetching
const paperContentCache = new Map<string, string>();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: Request) {
  try {
    const { paperId, conversationHistory } = await request.json();

    // Get or fetch paper content
    let paperContent = paperContentCache.get(paperId);
    if (!paperContent) {
      paperContent = await generateFullPaperSummaryFromUrl(paperId);
      if (paperContent) {
        paperContentCache.set(paperId, paperContent);
      }
    }

    if (!paperContent) {
      return NextResponse.json(
        { error: 'Could not retrieve paper content' },
        { status: 400 }
      );
    }

    // Prepare the messages array with system message and conversation history
    const messages: Message[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant answering questions about a research paper. 
                 Use the provided paper content to answer questions accurately and concisely. 
                 If you're not sure about something, say so.
                 Here's the paper content: ${paperContent}`
      }
    ];

    // Add conversation history if it exists
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Create a streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    // Set up Server-Sent Events stream
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 