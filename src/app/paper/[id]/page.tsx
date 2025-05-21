import { fetchLatestPapers } from "@/lib/arxiv";
import { generateFullPaperSummaryFromUrl, generatePaperCritique } from "@/lib/openai";
import { cosineSimilarity } from "@/lib/utils";
import Link from "next/link";
import CollapsibleSection from "@/components/CollapsibleSection";
import PaperChatBox from "@/components/PaperChatBox";

interface Paper {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    pdfLink: string;
    summary?: string;
    tags?: string[];
    categories?: string[];
    embedding?: number[] | null;
}

interface PaperDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// This function now not only gets the paper but could also prepare corpus embeddings if needed
// For simplicity, we'll calculate novelty based on all OTHER papers fetched.
async function getPaperAndCorpus(encodedId: string): Promise<{ currentPaper: Paper | undefined, corpus: Paper[] }> {
  const allPapers = await fetchLatestPapers(); 
  const decodedId = decodeURIComponent(encodedId);
  const currentPaper = allPapers.find(paper => paper.id === decodedId);
  const corpus = allPapers.filter(paper => paper.id !== decodedId && paper.embedding);
  return { currentPaper, corpus };
}

export default async function PaperDetailPage({ params }: PaperDetailPageProps) {
  const resolvedParams = await params;
  const { currentPaper: paper, corpus } = await getPaperAndCorpus(resolvedParams.id);

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] p-8 text-center">
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-4">Paper not found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">The paper you are looking for does not exist or could not be loaded.</p>
        <Link href="/?tab=papers" className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors">
          &larr; Back to All Papers
        </Link>
      </div>
    );
  }

  const fullSummaryPromise = generateFullPaperSummaryFromUrl(paper.id);
  const fullSummary = await fullSummaryPromise;
  const paperCritique = await generatePaperCritique(paper.abstract, fullSummary || '');

  let noveltyScore: number | null = null;
  if (paper.embedding && corpus.length > 0) {
    let maxSimilarity = 0;
    for (const corpusPaper of corpus) {
      if (corpusPaper.embedding) {
        const similarity = cosineSimilarity(paper.embedding, corpusPaper.embedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
    }
    noveltyScore = 1 - maxSimilarity;
  } else if (!paper.embedding) {
    console.warn(`Paper ${paper.id} does not have an embedding. Cannot calculate novelty.`);
  } else if (corpus.length === 0) {
    console.warn(`Corpus is empty. Cannot calculate novelty for ${paper.id}.`);
  }

  return (
    <div className="max-w-[90rem] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Link href="/?tab=papers" className="inline-flex items-center text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 mb-6 group">
        <svg className="w-4 h-4 mr-1.5 transform transition-transform duration-150 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to All Papers
      </Link>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel - Paper details */}
        <article className="bg-white dark:bg-slate-800 shadow-xl rounded-lg overflow-hidden lg:flex-1">
          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-start mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex-1 pr-4">{paper.title}</h1>
              {noveltyScore !== null && (
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Novelty Score</p>
                  <p className={`text-3xl font-bold ${noveltyScore > 0.85 ? 'text-emerald-500' : noveltyScore > 0.6 ? 'text-amber-500' : 'text-red-500'}`}>
                    {noveltyScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">(vs current batch)</p>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6"><strong>Authors:</strong> {paper.authors.join(', ')}</p>
            
            {paper.tags && paper.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {paper.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-sky-100 text-sky-700 dark:bg-sky-700/60 dark:text-sky-200 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Abstract section */}
            <section className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Abstract</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {paper.abstract}
              </div>
            </section>

            <CollapsibleSection 
              title="Detailed Summary" 
              peekText={fullSummary && typeof fullSummary === 'string' ? fullSummary : undefined}
            >
              {fullSummary ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {fullSummary}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Generating detailed summary... please wait or check back.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection 
              title="Validity" 
              titleClassName="text-xl font-semibold text-slate-700 dark:text-slate-300"
              peekText={paperCritique.analysis}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-grow prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                    {paperCritique.analysis}
                  </div>
                  <div className="flex-shrink-0 ml-6">
                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full ${
                      paperCritique.isValid 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {paperCritique.isValid ? (
                        <>
                          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <span className={`text-sm font-medium ${
                        paperCritique.isValid 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {paperCritique.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
            
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link 
                  href={paper.id} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 font-medium flex items-center"
                >
                  <span>arXiv</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </Link>
                <Link 
                  href={paper.pdfLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-medium flex items-center"
                >
                  <span>PDF</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Right panel - Chat box */}
        <div className="lg:w-[400px] xl:w-[450px] flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg sticky top-24">
            <PaperChatBox paperId={paper.id} paperTitle={paper.title} />
          </div>
        </div>
      </div>
    </div>
  );
}

// This function can be used to generate static paths if you want to pre-render these pages at build time.
// export async function generateStaticParams() {
//   const papers = await fetchLatestPapers(); 
//   return papers.map(paper => ({ id: encodeURIComponent(paper.id) }));
// } 