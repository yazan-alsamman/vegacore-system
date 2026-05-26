'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role?: { name: string; slug: string };
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
}

interface ChatRoom {
  id: string;
  name?: string | null;
  isGroup: boolean;
  participants: { user: ChatUser }[];
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
  } | null;
}

interface Workspace {
  rooms: ChatRoom[];
  members: ChatUser[];
  teamRoomId: string;
}

function roomTitle(room: ChatRoom, myId: string, teamLabel: string) {
  if (room.isGroup && room.name) return room.name;
  const other = room.participants.find((p) => p.user.id !== myId)?.user;
  return other ? `${other.firstName} ${other.lastName}` : teamLabel;
}

function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
}

export default function ChatPage() {
  const t = useTranslations('chat');
  const { user, token } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'rooms' | 'team'>('rooms');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    const ws = await api<Workspace>('/chat/workspace', { token });
    setWorkspace(ws);
    return ws;
  }, [token]);

  const loadMessages = useCallback(
    async (roomId: string) => {
      if (!token) return;
      const list = await api<ChatMessage[]>(`/chat/rooms/${roomId}/messages`, { token });
      setMessages(list);
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadWorkspace()
      .then((ws) => {
        if (ws) setActiveRoomId((prev) => prev ?? ws.teamRoomId);
      })
      .finally(() => setLoading(false));
  }, [token, loadWorkspace]);

  useEffect(() => {
    if (!activeRoomId || !token) return;
    loadMessages(activeRoomId);
    const interval = setInterval(() => {
      loadMessages(activeRoomId);
      loadWorkspace();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRoomId, token, loadMessages, loadWorkspace]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeRoom = workspace?.rooms.find((r) => r.id === activeRoomId);

  const openDirect = async (memberId: string) => {
    if (!token) return;
    const room = await api<ChatRoom>('/chat/rooms/direct', {
      method: 'POST',
      token,
      body: JSON.stringify({ userId: memberId }),
    });
    await loadWorkspace();
    setActiveRoomId(room.id);
    setTab('rooms');
    await loadMessages(room.id);
  };

  const send = async () => {
    if (!token || !activeRoomId || !draft.trim()) return;
    setSending(true);
    try {
      const msg = await api<ChatMessage>(`/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content: draft.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      loadWorkspace();
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout title={t('title')} module="chat">
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{t('description')}</p>

      <div className="flex h-[calc(100vh-12rem)] min-h-[420px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <aside className="flex w-full max-w-xs flex-col border-e border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex border-b border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setTab('rooms')}
              className={`flex-1 py-3 text-xs font-semibold ${tab === 'rooms' ? 'border-b-2 border-vega-cyan text-vega-navy dark:text-vega-cyan' : 'text-[var(--color-text-secondary)]'}`}
            >
              {t('conversations')}
            </button>
            <button
              type="button"
              onClick={() => setTab('team')}
              className={`flex-1 py-3 text-xs font-semibold ${tab === 'team' ? 'border-b-2 border-vega-cyan text-vega-navy dark:text-vega-cyan' : 'text-[var(--color-text-secondary)]'}`}
            >
              {t('team')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-vega-cyan border-t-transparent" />
              </div>
            ) : tab === 'rooms' ? (
              <ul className="space-y-1">
                {(workspace?.rooms || []).map((room) => (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                      className={`flex w-full gap-3 rounded-lg px-3 py-2.5 text-start transition-colors ${
                        activeRoomId === room.id ? 'bg-vega-navy/10 dark:bg-vega-cyan/15' : 'hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: room.isGroup ? 'var(--vega-gradient)' : '#2E3192' }}
                      >
                        {room.isGroup ? <Users className="h-4 w-4" /> : initials(room.participants[0]?.user || { firstName: '?', lastName: '' })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {roomTitle(room, user.id, t('teamChannel'))}
                        </span>
                        {room.lastMessage && (
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">
                            {room.lastMessage.sender.firstName}: {room.lastMessage.content}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1">
                {(workspace?.members || []).map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openDirect(m.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start hover:bg-[var(--color-surface)]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vega-navy/10 text-xs font-bold text-vega-navy dark:text-vega-cyan">
                        {initials(m)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-secondary)]">{m.role?.name}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {activeRoom ? (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3">
                <MessageSquare className="h-5 w-5 text-vega-cyan" />
                <div>
                  <h2 className="font-semibold text-sm">{roomTitle(activeRoom, user.id, t('teamChannel'))}</h2>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {activeRoom.isGroup ? t('groupChat') : t('directChat')}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--color-text-secondary)] py-12">{t('noMessages')}</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender.id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? 'rounded-ee-sm bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy'
                              : 'rounded-es-sm bg-[var(--color-surface-secondary)] border border-[var(--color-border)]'
                          }`}
                        >
                          {!mine && (
                            <p className="mb-1 text-[11px] font-semibold text-vega-cyan">
                              {msg.sender.firstName} {msg.sender.lastName}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'opacity-70' : 'text-[var(--color-text-secondary)]'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex gap-2 border-t border-[var(--color-border)] p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('placeholder')}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-vega-cyan"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--vega-gradient)' }}
                >
                  <Send className="h-4 w-4" />
                  {t('send')}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)]">
              <MessageSquare className="h-12 w-12 opacity-30" />
              <p className="text-sm">{t('selectRoom')}</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
