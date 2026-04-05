import {
  VIDEO_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { validateVideoChatMessages } from '@/shared/lib/api-security';
import {
  isInsufficientCreditsError,
  refundCredits,
} from '@/shared/models/credit';
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
    const validationError = validateVideoChatMessages(messages);
    if (!analysisId || validationError) {
      return new Response(validationError || 'analysisId is required', {
        status: 400,
      });
    }

    const model = requireSupportedAIModel(
      requestedModel,
      VIDEO_CHAT_DEFAULT_MODEL
    );

    let consumedCreditId: string | null = null;
    try {
      const { consumedCredit } = await consumeVideoChatCredits({
        userId: user.id,
        analysisId: String(analysisId),
        messages,
        model,
      });
      consumedCreditId = consumedCredit?.id || null;
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        return new Response('insufficient credits', { status: 402 });
      }

      throw error;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let hasSentAnswer = false;

        const send = (payload: Record<string, unknown>) => {
          if (payload.type === 'delta' || payload.type === 'done') {
            hasSentAnswer = true;
          }

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
          if (!hasSentAnswer && consumedCreditId) {
            try {
              await refundCredits(consumedCreditId);
            } catch (refundError) {
              console.error('video chat refund failed:', refundError);
            }
          }

          send({
            type: 'error',
            message: 'video chat failed',
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
    console.error('video chat failed:', error);
    return new Response('video chat failed', {
      status: 500,
    });
  }
}
