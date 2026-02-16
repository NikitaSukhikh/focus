import { StateCreator } from 'zustand';
import { Message } from '@/features/assistant/models/assistant';

export interface AssistantState {
  messages: Message[];
  isSending: boolean;
  currentAssistantId: string | null;
  addMessage: (_message: Message) => void;
  setMessages: (_messages: Message[]) => void;
  setIsSending: (_isSending: boolean) => void;
  setCurrentAssistantId: (_id: string | null) => void;
  clearMessages: () => void;
}

export const createAssistantSlice: StateCreator<AssistantState> = (set) => ({
  messages: [],
  isSending: false,
  currentAssistantId: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsSending: (isSending) => set({ isSending }),
  setCurrentAssistantId: (id) => set({ currentAssistantId: id }),
  clearMessages: () => set({ messages: [], currentAssistantId: null }),
});
