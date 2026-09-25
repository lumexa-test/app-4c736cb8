import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Send, Users } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/states';
import { InitialsAvatar } from '@/components/common/InitialsAvatar';
import { cn } from '@/lib/utils';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { WorkspaceMember, DirectMessage } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

export const Messages = (): FunctionComponent => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkspaceMember | null>(null);
  const [thread, setThread] = useState<DirectMessage[] | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient
      .get<WorkspaceMember[]>('/api/users')
      .then((all) => {
        const others = all.filter((m) => m.id !== user?.id);
        setMembers(others);
        const preselectId = Number(searchParams.get('with'));
        const preselect = others.find((m) => m.id === preselectId);
        if (preselect) setSelected(preselect);
        else if (others.length > 0) setSelected(others[0] ?? null);
      })
      .catch((e) => setMembersError(e instanceof ApiError ? e.message : 'Failed to load workspace members'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadThread = useCallback(() => {
    if (!selected) return;
    apiClient
      .get<DirectMessage[]>(`/api/direct-messages?with=${selected.id}`)
      .then(setThread)
      .catch((e) => setThreadError(e instanceof ApiError ? e.message : 'Failed to load conversation'));
  }, [selected]);

  useEffect(() => {
    setThread(null);
    setThreadError(null);
    if (selected) {
      setSearchParams({ with: String(selected.id) }, { replace: true });
      loadThread();
    }
    const interval = setInterval(loadThread, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !selected) return;
    setSending(true);
    try {
      const message = await apiClient.post<DirectMessage>('/api/direct-messages', { recipientId: selected.id, body: body.trim() });
      setThread((prev) => (prev ? [...prev, message] : [message]));
      setBody('');
      toast.success('Direct message sent');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Direct Messages" description="One-on-one conversations with anyone in your workspace." />

        <Card className="shadow-card overflow-hidden">
          <CardContent className="grid grid-cols-1 gap-0 p-0 md:grid-cols-[240px_1fr]">
            {/* Member list */}
            <div className="border-b md:border-b-0 md:border-r">
              <div className="flex items-center gap-2 border-b p-4 text-sm font-semibold text-muted-foreground">
                <Users className="size-4" /> Members
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {membersError ? (
                  <ErrorState className="border-none" message={membersError} />
                ) : !members ? (
                  <LoadingState label="Loading members…" />
                ) : members.length === 0 ? (
                  <EmptyState className="border-none" title="No other members yet" />
                ) : (
                  members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelected(m)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/60',
                        selected?.id === m.id && 'bg-muted',
                      )}
                    >
                      <InitialsAvatar name={m.displayName} size="sm" />
                      <span className="truncate text-sm font-medium text-foreground">{m.displayName}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Conversation */}
            <div className="flex min-h-[420px] flex-col">
              {!selected ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState className="border-none" title="Select a member" description="Pick someone from the list to start a conversation." />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b p-4">
                    <InitialsAvatar name={selected.displayName} size="sm" />
                    <span className="font-semibold text-foreground">{selected.displayName}</span>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {threadError ? (
                      <ErrorState className="border-none" message={threadError} onRetry={loadThread} />
                    ) : !thread ? (
                      <LoadingState label="Loading conversation…" />
                    ) : thread.length === 0 ? (
                      <EmptyState className="border-none" title="No messages yet" description={`Say hello to ${selected.displayName}.`} />
                    ) : (
                      <>
                        {thread.map((m) => {
                          const mine = m.senderId === user?.id;
                          return (
                            <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                                )}
                              >
                                {m.body}
                              </div>
                              <span className="mt-1 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</span>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </>
                    )}
                  </div>
                  <form onSubmit={handleSend} className="flex items-end gap-2 border-t p-4">
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={`Message ${selected.displayName}…`}
                      rows={1}
                      maxLength={4000}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                    />
                    <Button type="submit" disabled={sending || !body.trim()}>
                      <Send className="size-4" />
                    </Button>
                  </form>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
