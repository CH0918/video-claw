import {
  VIDEO_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { isInsufficientCreditsError } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { streamVideoQuestionAnswer } from '@/shared/services/video-analysis';
import { consumeVideoChatCredits } from '@/shared/services/video-analysis/credits';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return new Response('no auth, please sign in', { status: 401 });
    }

    const { analysisId, messages, model: requestedModel } = await req.json();
    if (!analysisId || !Array.isArray(messages) || messages.length === 0) {
      return new Response('analysisId and messages are required', {
        status: 400,
      });
    }

    const model = requireSupportedAIModel(
      requestedModel,
      VIDEO_CHAT_DEFAULT_MODEL
    );

    try {
      await consumeVideoChatCredits({
        userId: user.id,
        analysisId: String(analysisId),
        messages,
        model,
      });
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        return new Response('insufficient credits', { status: 402 });
      }

      throw error;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        try {
          for await (const chunk of streamVideoQuestionAnswer(
            String(analysisId),
            messages,
            model
          )) {
            send(chunk as Record<string, unknown>);
          }
        } catch (error: any) {
          send({
            type: 'error',
            message: error?.message || 'video chat failed',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
    });
  } catch (error: any) {
    return new Response(error?.message || 'video chat failed', {
      status: 500,
    });
  }
}
