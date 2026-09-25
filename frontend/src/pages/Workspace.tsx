import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Send, Bot, Hash } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/states';
import { InitialsAvatar } from '@/components/common/InitialsAvatar';
import { apiClient, ApiError } from '@/lib/apiClient';
import type { WorkspaceMessage } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

// Workspace — a Slack-style shared feed for the whole tenant. Messages are
// mirrored here AND (per the PRD) would post to the connected Slack channel;
// since Slack is "planned for a future version", the bot-authored rows
// (video-completion alerts) simulate what that channel post would say.
export const Workspace = (): FunctionComponent => {
  const [messages, setMessages] = useState<WorkspaceMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiClient
      .get<WorkspaceMessage[]>('/api/messages')
      .then(setMessages)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load workspace messages'));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const message = await apiClient.post<WorkspaceMessage>('/api/messages', { body: body.trim() });
      setMessages((prev) => (prev ? [...prev, message] : [message]));
      setBody('');
      toast.success('Message sent');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Workspace" description="The shared feed for your team — posts here also go to your connected Slack channel." />

        <Card className="shadow-card">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Hash className="size-4" /> general
            </div>

            <div className="flex max-h-[55vh] min-h-[240px] flex-col gap-4 overflow-y-auto rounded-md border bg-background/50 p-4">
              {error ? (
                <ErrorState message={error} onRetry={load} />
              ) : !messages ? (
                <LoadingState label="Loading messages…" />
              ) : messages.length === 0 ? (
                <EmptyState title="No messages yet" description="Say hello to your workspace." />
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className="flex gap-3">
                      {m.isBot ? (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bot className="size-5" />
                        </div>
                      ) : (
                        <InitialsAvatar name={m.authorDisplayName} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground">{m.authorDisplayName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="break-words text-sm text-foreground">{m.body}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            <form onSubmit={handleSend} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message the workspace…"
                rows={2}
                maxLength={4000}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <Button type="submit" disabled={sending || !body.trim()} className="sm:w-auto">
                <Send className="size-4" /> {sending ? 'Sending…' : 'Send'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
