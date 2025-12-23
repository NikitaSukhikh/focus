export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
