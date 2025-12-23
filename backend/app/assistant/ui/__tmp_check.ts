// Chat window container orchestrating chat UI.

import React, { useState } from 'react';
import { Mail, DollarSign, Calendar, Sparkles, MessageSquare } from 'lucide-react';

type Domain = 'general' | 'email' | 'finance' | 'calendar' | 'claude' | 'chatgpt';

interface NavigationItem {
  id: Domain;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export function ChatWindow() {
  const [activeDomain, setActiveDomain] = useState<Domain>('general');

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
                ${
                  activeDomain === item.id
                     'bg-gray-100 shadow-sm'
                    : 'hover:bg-gray-50'
                }
              `}
            >
              <span className={item.color}>
                {item.icon}
              </span>
              <span
                className={`
                  text-sm font-medium
                  ${
                    activeDomain === item.id
                       'text-gray-900'
                      : 'text-gray-600'
                  }
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
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Welcome Message */}
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to Alfy
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Your 100% local AI personal assistant. Ask me anything about your
                {' '}
                {activeDomain === 'email' && 'emails'}
                {activeDomain === 'finance' && 'finances'}
                {activeDomain === 'calendar' && 'calendar'}
                {activeDomain === 'claude' && 'Claude conversations'}
                {activeDomain === 'chatgpt' && 'ChatGPT conversations'}
                {activeDomain === 'general' && 'files, emails, calendar, or finances'}
                .
              </p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  placeholder={`Ask about your ${activeDomain === 'general'  'data' : activeDomain}...`}
                  rows={1}
                  className="
                    w-full px-4 py-3 pr-12
                    border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    resize-none
                    placeholder-gray-400
                    text-gray-900
                  "
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
                <button
                  className="
                    absolute right-2 bottom-2
                    p-2 rounded-lg
                    bg-blue-600 hover:bg-blue-700
                    text-white
                    transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
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
