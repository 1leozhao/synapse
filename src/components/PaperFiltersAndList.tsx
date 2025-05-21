'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Paper as ArxivPaper } from '@/lib/arxiv';
import { useRouter } from 'next/navigation';
// cosineSimilarity is no longer needed here as novelty is not calculated/displayed on cards
// import { cosineSimilarity } from '@/lib/utils';

// Removed PaperCardData interface, will use ArxivPaper directly

// Removed empty PaperFiltersAndListProps interface, using props directly in function signature

// getNoveltyScoreColor is no longer needed here
// const getNoveltyScoreColor = (score: number | undefined): string => {
//   if (score === undefined) return 'text-gray-500';
//   if (score > 0.75) return 'text-green-600';
//   if (score > 0.5) return 'text-yellow-600';
//   return 'text-red-600';
// };

export default function PaperFiltersAndList({ papers, allCategories }: { papers: ArxivPaper[], allCategories: string[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingPaperId, setLoadingPaperId] = useState<string | null>(null);
  const router = useRouter();
  
  // The `papers` prop is used directly for filtering and display.
  // No client-side novelty calculation needed here anymore.
  // const [papersWithNovelty, setPapersWithNovelty] = useState<PaperCardData[]>(papers);

  const filteredAndSortedPapers = useMemo(() => {
    let tempPapers = [...papers]; // Use the `papers` prop directly

    if (searchQuery) {
      tempPapers = tempPapers.filter(paper =>
        paper.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all' && selectedCategory !== '') {
      tempPapers = tempPapers.filter(paper =>
        paper.categories?.includes(selectedCategory)
      );
    }
    
    // Sorting by novelty is removed as novelty is not calculated here.
    // tempPapers.sort((a, b) => (b.noveltyScore ?? -1) - (a.noveltyScore ?? -1));

    return tempPapers;
  }, [papers, searchQuery, selectedCategory]); // Depend on `papers` directly

  const handlePaperClick = (paperId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setLoadingPaperId(paperId);
    router.push(`/paper/${encodeURIComponent(paperId)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search papers by title..."
          className="flex-grow p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">Categories</option>
          {allCategories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {filteredAndSortedPapers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPapers.map(paper => (
            <Link 
              href={`/paper/${encodeURIComponent(paper.id)}`} 
              key={paper.id} 
              onClick={(e) => handlePaperClick(paper.id, e)}
              className="block hover:shadow-lg transition-shadow duration-200"
            >
              <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col dark:bg-slate-800 relative">
                {loadingPaperId === paper.id && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center rounded-lg z-10">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-sky-500 dark:border-slate-600 dark:border-t-sky-400"></div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Fetching details...</p>
                    </div>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300 min-h-[3em] break-words">
                  {paper.title}
                </h3>
                
                {/* Tags display remains, novelty score display is removed */} 
                {paper.tags && paper.tags.length > 0 && ( 
                  <div className="flex flex-wrap gap-2 mb-3">
                    {paper.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200 px-2 py-0.5 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                  <strong>Authors:</strong> {paper.authors?.join(', ') || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">
                  <strong>Categories:</strong> {paper.categories?.join(', ') || 'N/A'}
                </p>
                {paper.abstract && (
                  <div className="mt-2 text-sm text-gray-700 dark:text-slate-300 flex-grow overflow-hidden">
                    <p className="line-clamp-4 break-words">
                      {paper.abstract}
                    </p>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-4">
                    <a
                      href={paper.id}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 font-medium flex items-center"
                    >
                      <span>arXiv</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                    <a
                      href={paper.pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-medium flex items-center"
                    >
                      <span>PDF</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">
                    Updated {paper.updatedDate ? new Date(paper.updatedDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-slate-400 py-8">
          {searchQuery || selectedCategory !== 'all' ? 'No papers match your filters.' : 'No papers available at the moment.'}
        </p>
      )}
    </div>
  );
} 