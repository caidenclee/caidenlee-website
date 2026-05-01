import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const ONBOARDING_PROMPT = `You are Faith — a warm, smart personal AI assistant meeting Caiden Lee for the first time during setup.

Your job is to get to know Caiden through natural conversation. Ask thoughtful questions about who he is beyond cubing — his bigger goals, values, what drives him, his habits, what he's working toward in life, how he thinks, what matters to him.

Rules:
- Ask ONE question at a time — never multiple questions in one message
- Keep responses short and conversational — a brief warm reaction, then one question
- Build on what he says — ask genuine follow-up questions based on his actual answers
- Do NOT ask about cubing, YouTube, or GAN — you already know all that
- Ask about life stuff: dreams, what success looks like to him, his values, daily habits, how he recharges, what he's proud of, fears, what kind of person he wants to be
- Be genuinely curious and warm — like a friend getting to know him for the first time
- Never be stiff or formal

Start by saying something like "Before we dive in, I want to get to know the real you — not just the cubing stuff." then ask your first open-ended question.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 200,
          system: ONBOARDING_PROMPT,
          messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Start the conversation.' }],
        });

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: 'Having trouble connecting — try again!' })}\n\n`)
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
