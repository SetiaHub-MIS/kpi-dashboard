import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { User } from '@/data/users';
import { QueryMessage, fetchQueries, sendQuery, subscribeToQueries } from '@/lib/queries';
import { C } from '@/theme/scoring';

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * One mark's question/answer thread. Lives inline in the page's own scroll —
 * not its own nested ScrollView, which React Native handles badly — so new
 * messages just append at the bottom like the rest of the screen's content.
 *
 * `nameOf` resolves a sender's payroll number to a display name; both sides
 * already have the other party in their own `useUsers` list (same branch),
 * so this needs no extra query.
 */
export function QueryThread({
  markId,
  me,
  nameOf,
}: {
  markId: number;
  me: User | undefined;
  nameOf: (userId: string) => string;
}) {
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchQueries(markId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeToQueries(markId, (m) => {
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [markId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !me || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendQuery(markId, me.id, body);
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="mt-4">
      {loading && messages.length === 0 ? (
        <Text className="font-sans text-[12.5px] text-ink-5">Memuatkan…</Text>
      ) : messages.length === 0 ? (
        <Text className="font-sans text-[12.5px] text-ink-5">
          Belum ada soalan. Tanya di bawah.
        </Text>
      ) : (
        <View className="gap-2.5">
          {messages.map((m) => {
            const mine = m.senderId === me?.id;
            return (
              <View
                key={m.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: mine ? C.ink : C.card,
                  borderWidth: mine ? 0 : 1,
                  borderColor: C.line,
                }}
              >
                {!mine && (
                  <Text
                    className="font-mono-med text-[9.5px] uppercase tracking-label mb-1"
                    style={{ color: C.ink5 }}
                  >
                    {nameOf(m.senderId)}
                  </Text>
                )}
                <Text
                  className="font-sans text-[13px] leading-[19px]"
                  style={{ color: mine ? '#FFFFFF' : C.ink2 }}
                >
                  {m.body}
                </Text>
                <Text
                  className="font-mono text-[9.5px] mt-1.5"
                  style={{ color: mine ? 'rgba(255,255,255,0.6)' : C.ink6 }}
                >
                  {timeLabel(m.createdAt)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View className="flex-row gap-2 items-end mt-3.5 pt-3.5 border-t border-rule">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Tulis soalan…"
          placeholderTextColor={C.ink7}
          multiline
          className="flex-1 font-sans text-[13px] text-ink border border-line rounded-[10px] px-3 py-2.5"
          style={{ maxHeight: 100 }}
        />
        <Pressable
          onPress={() => void send()}
          accessibilityRole="button"
          disabled={!draft.trim() || sending}
          className="py-2.5 px-4 rounded-[10px] bg-ink items-center justify-center"
          style={{ opacity: draft.trim() ? 1 : 0.4 }}
        >
          <Text className="font-sans-semi text-[12.5px] text-white">Hantar</Text>
        </Pressable>
      </View>
    </View>
  );
}
