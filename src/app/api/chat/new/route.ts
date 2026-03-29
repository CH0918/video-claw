import { generateId } from 'ai';

import {
  GENERAL_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, createChat, NewChat } from '@/shared/models/chat';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const { message, body } = await req.json();
    if (!message || !message.text) {
      throw new Error('message is required');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // todo: check user credits

    const provider = 'evolink';
    const model = requireSupportedAIModel(
      body?.model,
      GENERAL_CHAT_DEFAULT_MODEL
    );

    // todo: auto generate title
    const title = message.text.substring(0, 100);

    const chatId = generateId().toLowerCase();
    const currentTime = new Date();

    const chat: NewChat = {
      id: chatId,
      userId: user.id,
      status: ChatStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      model,
      provider: provider,
      title: title,
      parts: '',
      // parts: JSON.stringify(parts),
      metadata: JSON.stringify({
        ...(body || {}),
        model,
      }),
      content: JSON.stringify(message),
    };

    await createChat(chat);

    return respData(chat);
  } catch (e: any) {
    console.log('new chat failed:', e);
    return respErr(`new chat failed: ${e.message}`);
  }
}
