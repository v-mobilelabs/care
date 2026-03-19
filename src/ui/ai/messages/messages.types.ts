import type { ChatStatus, UIMessage } from "ai";

export type { ChatStatus };

export interface MessagesProps {
  messages: UIMessage[];
  /** Map of message ID → ISO timestamp for date separator rendering. */
  messageTimestamps?: ReadonlyMap<string, string>;
  /** Map of message ID → token usage, for assistant messages with tracked usage. */
  messageUsage?: ReadonlyMap<
    string,
    { promptTokens: number; completionTokens: number; totalTokens: number }
  >;
  isLoading: boolean;
  /** Status from `useChat` — drives the loading phrase selection. */
  chatStatus: ChatStatus;
  /** Firebase user photo URL — shown in the user avatar. */
  userPhotoURL?: string | null;
  /** Name initials shown as avatar fallback when no photo URL is available. */
  userInitials?: string;
  answeredIds: ReadonlyMap<string, string>;
  editingId: string | null;
  editingText: string;
  phraseIdx: number;
  phraseFading: boolean;
  /** Dynamic loading hints from gateway for contextual loading messages. */
  loadingHints?: string[];
  onAnswer: (toolCallId: string, answer: string) => void;
  onApproval: (opts: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => void;
  onEditStart: (msgId: string, text: string) => void;
  onEditChange: (text: string) => void;
  onEditKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    msgId: string,
  ) => void;
  onEditCancel: () => void;
  onEditSubmit: (msgId: string) => void;
  /** Called when the user clicks a starter card — sets the input text. */
  onStarterSelect: (text: string) => void;
  /** Called when the user clicks "Ask about [condition]" on a condition card — sends the message directly. */
  onLearnMore?: (text: string) => void;
  /** Error from the AI request, if any. */
  error?: Error | null;
  /** Called when the user clicks the Retry chip after an error. */
  onRetry?: () => void;
  /**
   * When set, shows the loading bubble with this fixed label before the AI
   * stream starts (e.g. "Scanning file…" or "Uploading file…").
   */
  preparingLabel?: string;
  /** Whether there are older messages to load. */
  hasNextPage?: boolean;
  /** Whether a page of older messages is currently being fetched. */
  isFetchingNextPage?: boolean;
  /** Fetch the next (older) page of messages. */
  onLoadMore?: () => void;
}
