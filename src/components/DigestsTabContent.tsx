'use client';

import { useState } from 'react';
import { DailyDigest, PaperDigest } from '@/lib/arxiv';
import Link from 'next/link';

export default function DigestsTabContent() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDigestContent, setShowDigestContent] = useState(false);
  const [generatedDigests, setGeneratedDigests] = useState<Array<{date: string, digest: DailyDigest}>>([]);

  const maxDate = new Date().toISOString().split('T')[0]; // Today's date

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    setError(null);
  };

  const handleGenerateDigest = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    setIsGenerating(false);
    setError(null);
    setShowDigestContent(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        setIsGenerating(true);
      }, 3000);

      const response = await fetch(`/api/digest?date=${selectedDate}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setError('No papers were submitted on this date.');
        setDigest(null);
        setIsLoading(false);
        setIsGenerating(false);
        return;
      }

      const fetchedDigest = await response.json();
      setDigest(fetchedDigest);
      setGeneratedDigests(prev => {
        const filtered = prev.filter(d => d.date !== selectedDate);
        return [...filtered, { date: selectedDate, digest: fetchedDigest }];
      });
      setError(null);
    } catch (e: unknown) {
      console.error("Error generating digest:", e);
      setError('No papers were submitted on this date.');
      setDigest(null);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleCardClick = (date: string, digestData: DailyDigest) => {
    setSelectedDate(date);
    setDigest(digestData);
    setShowDigestContent(true);
  };

  const handleCloseDigest = () => {
    setShowDigestContent(false);
  };

  const handleDownloadDigest = (digest: DailyDigest, date: string) => {
    const formatDate = (isoDate: string) => new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let htmlContent = `<html><head><title>Digest for ${formatDate(date)}</title>`;
    htmlContent += '<style>body { font-family: sans-serif; margin: 20px; } h1, h2, h3 { color: #333; } .paper, .theme, .outlier { margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 5px; } .label { font-weight: bold; } </style>';
    htmlContent += `</head><body>`;
    htmlContent += `<h1>Digest for ${formatDate(date)}</h1>`;
    htmlContent += `<h2>Key Takeaway</h2><p>${digest.keyTakeaway}</p>`;

    htmlContent += `<h2>Top Papers Today</h2>`;
    digest.topPapers.forEach((paper, index) => {
      htmlContent += `<div class="paper"><h3>#${index + 1}: ${paper.title}</h3>`;
      htmlContent += `<p><span class="label">Abstract:</span> ${paper.abstract}</p>`;
      htmlContent += `<p><span class="label">Why This Matters:</span> ${paper.significance}</p>`;
      htmlContent += `<p><span class="label">Categories:</span> ${paper.categories.join(', ')}</p></div>`;
    });

    htmlContent += `<h2>Emerging Themes</h2>`;
    digest.emergingThemes.forEach(theme => {
      htmlContent += `<div class="theme"><h3>${theme.theme}</h3>`;
      htmlContent += `<p>${theme.description}</p>`;
      htmlContent += `<p><span class="label">Related Papers:</span> ${theme.relatedPaperIds.length}</p></div>`;
    });

    htmlContent += `<h2>Weird Flex</h2>`;
    htmlContent += `<div class="outlier"><h3>${digest.outlierPick.paper.title}</h3>`;
    htmlContent += `<p><span class="label">Abstract:</span> ${digest.outlierPick.paper.abstract}</p>`;
    htmlContent += `<p><span class="label">Why It's Interesting:</span> ${digest.outlierPick.whyInteresting}</p></div>`;

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arxiv-digest-${date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderPaperCard = (paper: PaperDigest, index?: number) => (
    <div key={paper.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-semibold text-sky-700 dark:text-sky-400 mb-2">
          {index !== undefined && <span className="text-slate-500 dark:text-slate-400 mr-2">#{index + 1}</span>}
          {paper.title}
        </h3>
        <div className="flex items-center space-x-4">
          <Link 
            href={paper.id}
            target="_blank"
            className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 text-sm flex items-center"
          >
            <span>arXiv</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </Link>
          <Link 
            href={paper.pdfLink} 
            target="_blank"
            className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 text-sm flex items-center"
          >
            <span>PDF</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </Link>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{paper.abstract}</p>
      <div className="bg-sky-50 dark:bg-sky-900/30 rounded p-4 mb-4">
        <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2">Why This Matters:</h4>
        <p className="text-sm text-slate-700 dark:text-slate-300">{paper.significance}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {paper.categories.map(category => (
          <span key={category} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs">
            {category}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {!showDigestContent && (
        <div>
          <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-8">
            Daily Research Digest
          </h2>
          <div className="mb-6 flex items-end gap-4">
            <div>
              <label htmlFor="digest-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Select Date:
              </label>
              <input
                type="date"
                id="digest-date"
                value={selectedDate}
                onChange={handleDateChange}
                max={maxDate}
                className="p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <button
              onClick={handleGenerateDigest}
              disabled={isLoading || isGenerating}
              className="px-4 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-md transition-colors"
            >
              Generate Digest
            </button>
          </div>
        </div>
      )}

      {(isLoading || isGenerating) && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-sky-500 dark:border-slate-600 dark:border-t-sky-400 mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">
            {isGenerating ? 'Analyzing papers and generating digest...' : 'Loading papers...'}
          </p>
          {isGenerating && (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              This may take a minute as we carefully analyze the papers.
            </p>
          )}
        </div>
      )}

      {error && !isLoading && !isGenerating && (
        <div className="text-center py-4">
          <p className="text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      )}

      {!showDigestContent && !isLoading && !isGenerating && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedDigests.map(({ date, digest }) => (
            <div
              key={date}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex flex-col justify-between relative"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click event
                  handleDownloadDigest(digest, date);
                }}
                title="Download Digest"
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h3 
                  onClick={() => handleCardClick(date, digest)}
                  className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-2 cursor-pointer hover:underline pr-10"
                >
                  Digest for {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p 
                  onClick={() => handleCardClick(date, digest)}
                  className="text-sm text-slate-600 dark:text-slate-300 mb-4 cursor-pointer"
                >
                  {digest.keyTakeaway}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDigestContent && digest && (
        <div className="relative">
          <button
            onClick={handleCloseDigest}
            className="absolute right-0 top-0 px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕ Close
          </button>
          <div className="space-y-12 mt-8">
            <section>
              <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">
                Top Papers Today
              </h3>
              <div className="space-y-6">
                {digest.topPapers.map((paper, index) => renderPaperCard(paper, index))}
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">
                Emerging Themes
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {digest.emergingThemes.map((theme, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                    <h4 className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-2">
                      {theme.theme}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">{theme.description}</p>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {theme.relatedPaperIds.length} related papers
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">
                Weird Flex
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
                {renderPaperCard(digest.outlierPick.paper)}
                <div className="mt-4 bg-sky-50 dark:bg-sky-900/30 rounded p-4">
                  <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2">Why It&apos;s Interesting:</h4>
                  <p className="text-slate-700 dark:text-slate-300">{digest.outlierPick.whyInteresting}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
} 