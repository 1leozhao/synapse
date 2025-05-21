'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PaperChatBoxProps {
  paperId: string;
  paperTitle: string;
}

export default function PaperChatBox({ paperId, paperTitle }: PaperChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageRef = useRef('');

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to the conversation
    const newUserMessage: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setStreamingContent('');
    streamingMessageRef.current = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          message: userMessage,
          conversationHistory: updatedMessages
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        // Process each line
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // When stream is complete, add the full message to the conversation
              setMessages(prev => [...prev, { role: 'assistant', content: streamingMessageRef.current }]);
              setStreamingContent('');
              break;
            }
            try {
              const parsed = JSON.parse(data);
              streamingMessageRef.current += parsed.content;
              setStreamingContent(streamingMessageRef.current);
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch {
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {paperTitle}
        </h3>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="group">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {msg.role === 'user' ? 'You' : 'Synapse'}
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {msg.content}
            </div>
            {idx < messages.length - 1 && (
              <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
            )}
          </div>
        ))}
        {streamingContent && (
          <div className="group">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Assistant
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {streamingContent}
            </div>
          </div>
        )}
        {isLoading && !streamingContent && (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md 
                     bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                     focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 
                     disabled:bg-slate-300 dark:disabled:bg-slate-600
                     disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 