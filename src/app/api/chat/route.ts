import {
  createAgentUIStream,
  createIdGenerator,
  createUIMessageStream,
} from "ai";
import { WithContext } from "@/lib/api/with-context";
import {
  buildChatResponse,
  handleAgentStepFinish,
  handleAgentStreamFinish,
  handleChatStreamError,
  runChatPreparationGraph,
  scheduleChatPersistence,
  type PersistPayload,
  streamDirectResponse,
} from "@/data/shared/service/agents/chat/langgraph-chat-api-flow.service";

export const POST = WithContext(async ({ user, profileId, req }) => {
  console.log("[Chat API] Request started");

  const body = await req.json();
  const { isUserTurn, preparedChat, usageState } =
    await runChatPreparationGraph({
      userId: user.uid,
      profileId,
      body,
    });

  const {
    agent,
    sanitizedMessages,
    messages,
    options,
    agentType,
    loadingHints,
    sessionId,
    ctx,
    gatewayReasoning,
    directResponse,
    toolOutputMerge,
  } = preparedChat;

  let persistPayload: PersistPayload | null = null;

  scheduleChatPersistence({
    isUserTurn,
    userId: user.uid,
    profileId,
    sessionId,
    agentType,
    ctx,
    getPersistPayload: () => persistPayload,
    getUsageState: () => usageState,
    options,
  });

  const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (isUserTurn) {
        writer.write({
          type: "start",
          messageId: generateMessageId(),
        });
      }

      if (directResponse) {
        streamDirectResponse({
          writer,
          text: directResponse.text,
          setPersistPayload: (payload) => {
            persistPayload = payload;
          },
          ctx,
        });
        return;
      }

      const [stage, ...remainingLoadingHints] = loadingHints;
      writer.write({
        type: "data-progress",
        data: {
          stage: stage ?? "",
          loadingHints: remainingLoadingHints,
          agentType,
          reasoning: gatewayReasoning,
        },
        transient: true,
      });

      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: sanitizedMessages,
        options,
        abortSignal: req.signal,
        sendReasoning: true,
        sendStart: false,
        originalMessages: messages as Parameters<
          typeof createAgentUIStream
        >[0]["originalMessages"],
        generateMessageId,
        onStepFinish: (stepResult) =>
          handleAgentStepFinish(usageState, stepResult),
        onFinish: (finishPayload) => {
          handleAgentStreamFinish({
            finishPayload,
            ctx,
            isUserTurn,
            toolOutputMerge,
            usageState,
            agentType,
            setPersistPayload: (payload) => {
              persistPayload = payload;
            },
            writer,
          });
        },
      });

      writer.merge(agentStream);
    },
    onError: handleChatStreamError,
  });

  return buildChatResponse({ stream, sessionId });
});
