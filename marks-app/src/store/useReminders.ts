import { create } from 'zustand';
import { Reminder } from '@/lib/reminders';

type RemindersState = {
  items: Reminder[];
  hydrate: (items: Reminder[]) => void;
  setRead: (id: number, readAt: string) => void;
};

export const useReminders = create<RemindersState>((set) => ({
  items: [],
  hydrate: (items) => set({ items }),
  setRead: (id, readAt) =>
    set((s) => ({
      items: s.items.map((r) => (r.id === id ? { ...r, readAt } : r)),
    })),
}));

export const unreadReminders = (items: Reminder[]) => items.filter((r) => r.readAt == null);
