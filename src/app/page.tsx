import { fetchLatestPapers } from '@/lib/arxiv';
import PaperFiltersAndList from '@/components/PaperFiltersAndList';
import DigestsTabContent from '@/components/DigestsTabContent';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  params: Promise<Record<string, never>>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function PapersTabContent() {
  const papers = await fetchLatestPapers();

  // Derive unique categories from the fetched papers
  const allPaperCategories = papers.flatMap(paper => paper.categories || []);
  const allUniqueCategories = Array.from(new Set(allPaperCategories)).sort();

  return (
    <>
      <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">Latest Updated Papers</h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">Recent Developments in Computer Science and Mathematics</p>
      <PaperFiltersAndList papers={papers} allCategories={allUniqueCategories} />
    </>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams.tab || 'papers';
  return (
    <section className="w-full">
      {activeTab === 'papers' && <PapersTabContent />}
      {activeTab === 'digests' && <DigestsTabContent />}
    </section>
  );
}
