// Chat window container orchestrating chat UI.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, DollarSign, Calendar, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { TauriCommands } from '../../services/tauri';
import { BACKEND_URL } from '../../config/backend';

type Domain = 'general' | 'email' | 'finance' | 'calendar' | 'claude' | 'chatgpt';

interface NavigationItem {
  id: Domain;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWindow() {
  const [activeDomain, setActiveDomain] = useState<Domain>('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep latest backend URL (could be extended to a user setting later)
  const backendUrl = useMemo(() => BACKEND_URL, []);

  const navigationItems: NavigationItem[] = [
    {
      id: 'email',
      label: 'Mail',
      icon: <Mail size={20} />,
      color: 'text-blue-600'
    },
    {
      id: 'finance',
      label: 'Finances',
      icon: <DollarSign size={20} />,
      color: 'text-green-600'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar size={20} />,
      color: 'text-purple-600'
    },
    {
      id: 'claude',
      label: 'Claude',
      icon: <Sparkles size={20} />,
      color: 'text-orange-600'
    },
    {
      id: 'chatgpt',
      label: 'ChatGPT',
      icon: <MessageSquare size={20} />,
      color: 'text-teal-600'
    }
  ];

  useEffect(() => {
    // Ping backend once on mount to surface connectivity state.
    TauriCommands.pingBackend(backendUrl)
      .then(setBackendOnline)
      .catch(() => setBackendOnline(false));
  }, [backendUrl]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages.
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    const model: 'local' | 'claude' | 'chatgpt' =
      activeDomain === 'claude' ? 'claude' : activeDomain === 'chatgpt' ? 'chatgpt' : 'local';

    try {
      const reply = await TauriCommands.sendMessage(backendUrl, userMessage.content, model);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setBackendOnline(true);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to reach backend';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Backend error: ${error}` }
      ]);
      setBackendOnline(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-14 px-4 space-x-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveDomain(item.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg
                transition-all duration-200 ease-in-out
                ${activeDomain === item.id ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'}
              `}
            >
              <span className={item.color}>
                {item.icon}
              </span>
              <span
                className={`
                  text-sm font-medium
                  ${activeDomain === item.id ? 'text-gray-900' : 'text-gray-600'}
                `}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Backend status banner */}
        {backendOnline === false && (
          <div className="bg-red-50 text-red-700 border-b border-red-200 px-4 py-2 flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>Backend unreachable. Is FastAPI running at {backendUrl}?</span>
          </div>
        )}
        {backendOnline === true && (
          <div className="bg-emerald-50 text-emerald-700 border-b border-emerald-200 px-4 py-2 text-sm">
            Connected to backend at {backendUrl}
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-44" ref={listRef}>
          <div className="max-w-4xl ml-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to Alfy
                </h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Your 100% local AI personal assistant. Ask me anything about your{' '}
                  {activeDomain === 'email' && 'emails'}
                  {activeDomain === 'finance' && 'finances'}
                  {activeDomain === 'calendar' && 'calendar'}
                  {activeDomain === 'claude' && 'Claude conversations'}
                  {activeDomain === 'chatgpt' && 'ChatGPT conversations'}
                  {activeDomain === 'general' && 'files, emails, calendar, or finances'}
                  .
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-3xl px-4 py-3 rounded-xl shadow-sm ${
                    msg.role === 'user'
                      ? 'ml-auto bg-white text-gray-900 border border-gray-200 text-right'
                      : 'mr-auto bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 sticky bottom-12">
          <div className="max-w-3xl ml-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative border border-gray-300 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about your ${activeDomain === 'general' ? 'data' : activeDomain}...`}
                    rows={1}
                    className="
                      w-full px-4 py-3 pr-12
                      border-0 rounded-lg
                      focus:outline-none focus:ring-0
                      resize-none
                      placeholder-gray-400
                      text-gray-900
                      bg-transparent
                    "
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || !input.trim()}
                    className="
                      absolute right-2 bottom-2
                      p-2 rounded-lg
                      bg-blue-600 hover:bg-blue-700
                      text-white
                      transition-colors duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                    "
                    title="Send message"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Domain Context Indicator */}
            {activeDomain !== 'general' && (
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <span className="inline-flex items-center space-x-1">
                  <span className={navigationItems.find(item => item.id === activeDomain).color}>
                    {navigationItems.find(item => item.id === activeDomain).icon}
                  </span>
                  <span>
                    Focused on {activeDomain}
                  </span>
                </span>
                <button
                  onClick={() => setActiveDomain('general')}
                  className="ml-2 text-blue-600 hover:text-blue-700 underline"
                >
                  Clear focus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
