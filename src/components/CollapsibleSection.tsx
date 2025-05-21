'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  peekText?: string;
  initiallyOpen?: boolean;
  titleClassName?: string;
}

const PEEK_CHAR_LIMIT = 200;

export default function CollapsibleSection({
  title,
  children,
  peekText,
  initiallyOpen = false,
  titleClassName = "text-xl font-semibold text-slate-700 dark:text-slate-300"
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 text-left focus:outline-none"
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <h3 className={titleClassName}>{title}</h3>
        <svg 
          className={`w-5 h-5 text-slate-500 dark:text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      {!isOpen && peekText && (
        <div className="relative pt-1 pb-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="max-h-[4.5rem] overflow-hidden leading-normal">
            {peekText.substring(0, PEEK_CHAR_LIMIT)}{peekText.length > PEEK_CHAR_LIMIT ? '...' : ''}
          </div>
          {peekText.length > PEEK_CHAR_LIMIT && (
             <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-800 dark:via-slate-800/80"></div>
          )}
        </div>
      )}

      {isOpen && (
        <div 
          id={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="pt-2 pb-4 prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line"
        >
          {children}
        </div>
      )}
    </div>
  );
} 