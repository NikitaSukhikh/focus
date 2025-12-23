// Placeholder for assistant API calls
// Backend integration will be implemented later

export interface SendMessageRequest {
  message: string;
  assistantId?: string | null;
}

export interface SendMessageResponse {
  reply: string;
  assistantId: string;
}

export const assistantApi = {
  sendMessage: async (_request: SendMessageRequest): Promise<SendMessageResponse> => {
    // TODO: Implement backend integration
    throw new Error('Backend not yet implemented');
  },

  loadAssistantSession: async (_id: string) => {
    // TODO: Implement backend integration
    throw new Error('Backend not yet implemented');
  },
};
