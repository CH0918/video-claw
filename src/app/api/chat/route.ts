import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createIdGenerator,
  generateId,
  streamText,
  UIMessage,
} from 'ai';

import {
  GENERAL_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { normalizeEvolinkBaseUrl } from '@/shared/lib/evolink';
import { findChatById } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  createChatMessage,
  getChatMessages,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const {
      chatId,
      message,
      model: requestedModel,
      webSearch,
      reasoning,
    }: {
      chatId: string;
      message: UIMessage;
      model?: string;
      webSearch: boolean;
      reasoning?: boolean;
    } = await req.json();

    if (!chatId) {
      throw new Error('invalid params');
    }

    if (!message || !message.parts || message.parts.length === 0) {
      throw new Error('invalid message');
    }

    // check user sign
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // check chat
    const chat = await findChatById(chatId);
    if (!chat) {
      throw new Error('chat not found');
    }

    if (chat.userId !== user?.id) {
      throw new Error('no permission to access this chat');
    }

    const configs = await getAllConfigs();
    const evolinkApiKey = configs.evolink_api_key;
    if (!evolinkApiKey) {
      throw new Error('evolink_api_key is not set');
    }

    const model = requireSupportedAIModel(
      requestedModel,
      GENERAL_CHAT_DEFAULT_MODEL
    );
    const evolinkBaseUrl = normalizeEvolinkBaseUrl(configs.evolink_base_url);

    const currentTime = new Date();

    const metadata = {
      model,
      webSearch,
      reasoning,
    };

    const provider = 'evolink';

    // save user message to database
    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user?.id,
      status: ChatMessageStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      role: 'user',
      parts: JSON.stringify(message.parts),
      metadata: JSON.stringify(metadata),
      model: model,
      provider: provider,
    };
    await createChatMessage(userMessage);

    const openrouter = createOpenRouter({
      apiKey: evolinkApiKey,
      baseURL: evolinkBaseUrl,
    });

    // load previous messages from database
    const previousMessages = await getChatMessages({
      chatId,
      status: ChatMessageStatus.CREATED,
      page: 1,
      limit: 10,
    });

    let validatedMessages: UIMessage[] = [];
    if (previousMessages.length > 0) {
      validatedMessages = previousMessages.reverse().map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts ? JSON.parse(message.parts) : [],
      })) as UIMessage[];
    }

    const result = streamText({
      model: openrouter.chat(model),
      messages: convertToModelMessages(validatedMessages),
    });

    // send sources and reasoning back to the client
    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: Boolean(reasoning),
      originalMessages: validatedMessages,
      generateMessageId: createIdGenerator({
        size: 16,
      }),
      onFinish: async ({ messages }) => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'assistant') {
          const assistantMessage: NewChatMessage = {
            id: generateId().toLowerCase(),
            chatId,
            userId: user?.id,
            status: ChatMessageStatus.CREATED,
            createdAt: currentTime,
            updatedAt: currentTime,
            model: model,
            provider: provider,
            parts: JSON.stringify(lastMessage.parts),
            role: 'assistant',
          };
          await createChatMessage(assistantMessage);
        }
      },
    });
  } catch (e: any) {
    console.log('chat failed:', e);
    return new Response(e.message, { status: 500 });
  }
}
