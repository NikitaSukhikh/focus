import { useCallback } from 'react';
import { Message } from '@/features/assistant/models/assistant';

// Placeholder hook for assistant functionality
// Will be connected to Zustand store and API later

export function useAssistant() {
  const sendMessage = useCallback(async (text: string) => {
    // TODO: Implement with actual state management
    console.log('Sending message to assistant:', text);
  }, []);

  return {
    messages: [] as Message[],
    isSending: false,
    sendMessage,
  };
}
