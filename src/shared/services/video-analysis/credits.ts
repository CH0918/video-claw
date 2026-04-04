import { getSupportedAIModel, type SupportedAIModelId } from '@/shared/lib/ai-models';
import { md5 } from '@/shared/lib/hash';
import {
  consumeCredits,
  CreditReferenceType,
} from '@/shared/models/credit';
import type { VideoChatMessage } from '@/shared/types/video-analysis';

function buildVideoChatMessageDigest(messages: VideoChatMessage[]) {
  return md5(JSON.stringify(messages));
}

export function buildVideoChatReferenceId({
  analysisId,
  model,
  messages,
}: {
  analysisId: string;
  model: SupportedAIModelId;
  messages: VideoChatMessage[];
}) {
  return `${analysisId}:${model}:${buildVideoChatMessageDigest(messages)}`;
}

export async function consumeVideoChatCredits({
  userId,
  analysisId,
  model,
  messages,
}: {
  userId: string;
  analysisId: string;
  model: SupportedAIModelId;
  messages: VideoChatMessage[];
}) {
  const modelInfo = getSupportedAIModel(model);
  const creditCost = modelInfo?.creditCost ?? 0;

  if (creditCost <= 0) {
    return { creditCost: 0, consumedCredit: null };
  }

  const consumedCredit = await consumeCredits({
    userId,
    credits: creditCost,
    scene: 'video-chat',
    description: `video chat (${model})`,
    metadata: JSON.stringify({
      type: 'video-chat',
      analysisId,
      model,
    }),
    referenceType: CreditReferenceType.VIDEO_CHAT,
    referenceId: buildVideoChatReferenceId({
      analysisId,
      model,
      messages,
    }),
  });

  return { creditCost, consumedCredit };
}
