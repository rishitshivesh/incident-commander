import { getToolName, isToolUIPart, type ChatStatus, type UIMessage } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type AgentChatProps = {
  messages: UIMessage[];
  status: ChatStatus;
  onSend: (message: string) => void;
  onStop: () => void;
};

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") {
    return <div className="whitespace-pre-wrap leading-7">{part.text}</div>;
  }

  if (!isToolUIPart(part)) return null;

  const toolName = getToolName(part);
  const running = part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";

  return (
    <div className="my-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-200">{toolName}</span>
        <span>{failed ? "failed" : running ? "running" : "complete"}</span>
      </div>
      {part.state === "output-available" ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-500">
          {typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function EmptyState({ onUse }: { onUse: (message: string) => void }) {
  const prompts = [
    "Payments latency jumped to 4 seconds after the latest deployment. Investigate production.",
    "Checkout is returning 500s. Check its dependencies and recent deployments.",
    "Remember that payments depends heavily on Redis, Postgres and Kafka."
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-lg font-semibold">
        IC
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Describe what is breaking</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Incident Commander can inspect demo telemetry, remember service context and launch a durable investigation workflow.
      </p>
      <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onUse(prompt)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-xs leading-5 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentChat({ messages, status, onSend, onStop }: AgentChatProps) {
  const [draft, setDraft] = useState("");
  const isStreaming = status === "streaming" || status === "submitted";

  const send = useCallback(
    (message?: string) => {
      const nextMessage = (message ?? draft).trim();
      if (!nextMessage || isStreaming) return;
      onSend(nextMessage);
      setDraft("");
    },
    [draft, isStreaming, onSend]
  );

  const messageCount = useMemo(() => messages.length, [messages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">
        {messageCount === 0 ? (
          <EmptyState onUse={send} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-zinc-100 px-4 py-3 text-sm text-zinc-950"
                      : "max-w-[92%] text-sm text-zinc-300"
                  }
                >
                  {message.parts.map((part, index) => (
                    <MessagePart key={`${message.id}-${index}`} part={part} />
                  ))}
                </div>
              </div>
            ))}
            {isStreaming ? <div className="text-xs text-zinc-600">Incident Commander is working...</div> : null}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-900 bg-zinc-950/80 p-4 backdrop-blur md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2 shadow-2xl shadow-black/20 focus-within:border-zinc-700">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Describe an incident, ask for evidence, or add service context..."
            rows={2}
            className="max-h-32 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] text-zinc-600">Enter to send · Shift + Enter for a new line</span>
            <button
              type="button"
              onClick={() => (isStreaming ? onStop() : send())}
              disabled={!isStreaming && !draft.trim()}
              className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={isStreaming ? "Stop response" : "Send message"}
            >
              {isStreaming ? <Square size={13} fill="currentColor" /> : <ArrowUp size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
