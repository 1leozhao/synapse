import arxiv from 'arxiv-api';
import { getPaperAnalysis, getEmbeddingForText, generatePaperDigest } from './openai'; // Added generatePaperDigest
import { parseStringPromise } from 'xml2js'; // Uncomment this import

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  pdfLink: string;
  summary?: string; // Optional summary
  tags?: string[];    // Optional tags
  categories?: string[]; // Added for proper category filtering
  embedding?: number[] | null; // Added for novelty scoring
  publishedDate?: string; // Date of first submission
  updatedDate?: string; // Date of last update
}

export interface PaperDigest {
  id: string;
  title: string;
  abstract: string;
  significance: string; // Why this paper matters
  categories: string[];
  pdfLink: string;
}

export interface DailyDigest {
  date: string;
  topPapers: PaperDigest[]; // Top 5 papers with explanations
  emergingThemes: {
    theme: string;
    description: string;
    relatedPaperIds: string[];
  }[];
  outlierPick: {
    paper: PaperDigest;
    whyInteresting: string;
  };
  keyTakeaway: string; // A one-sentence summary of the day's most important development
}

const ARXIV_CATEGORIES_TO_FETCH = ['cs.AI', 'cs.LG', 'stat.ML']; // Renamed for clarity
const MAX_PAPERS_PER_CATEGORY = 5; // Reduced for faster testing with OpenAI calls

interface ArxivApiEntry {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  authors: string | { name: string } | Array<string | { name: string }>;
  categories?: string | Array<string | { term: string }>;
  pdfLink?: string;
  links?: Array<{ title?: string; href?: string }>;
  link?: { $: { title?: string; href?: string } } | Array<{ $: { title?: string; href?: string } }>;
  published?: string;
  updated?: string;
}

async function fetchPapersFromCategory(categoryToFetch: string): Promise<Paper[]> {
  try {
    const papersFromApi = await arxiv.search({
      searchQueryParams: [
        {
          include: [{ name: categoryToFetch, prefix: 'cat' }],
        },
      ],
      start: 0,
      maxResults: MAX_PAPERS_PER_CATEGORY,
      sortBy: 'lastUpdatedDate',
      sortOrder: 'descending',
    });

    // console.log("Raw papersFromApi response for category:", categoryToFetch, JSON.stringify(papersFromApi, null, 2));

    if (!papersFromApi || papersFromApi.length === 0) {
      console.error(`No entries found for category: ${categoryToFetch}`);
      return [];
    }

    // Process papers and get analysis (summary and tags)
    const processedPapers = await Promise.all(
      papersFromApi.map(async (entry: ArxivApiEntry) => {
        const title = entry.title.replace(/\n/g, ' ').trim();
        const abstract = (entry.summary || entry.description || '').replace(/\n/g, ' ').trim();
        
        const analysis = await getPaperAnalysis(title, abstract);
        // Use paper ID as cache key for its abstract embedding for simplicity
        const embedding = await getEmbeddingForText(abstract, entry.id);

        let paperCategories: string[] = [];
        if (entry.categories) {
          if (Array.isArray(entry.categories)) {
            paperCategories = entry.categories.map((cat: string | { term: string }) => typeof cat === 'string' ? cat : cat.term).filter(Boolean);
          } else if (typeof entry.categories === 'string') {
            paperCategories = [entry.categories];
          }
        }

        return {
          id: entry.id,
          title: title,
          abstract: abstract,
          authors: Array.isArray(entry.authors)
            ? entry.authors.flat().map((author: string | { name: string }) => (typeof author === 'string' ? author : author.name || 'Unknown Author'))
            : (typeof entry.authors === 'string' ? [entry.authors] : [(entry.authors?.name || 'Unknown Author')]),
          pdfLink: entry.pdfLink || (entry.links && entry.links.find((link: { title?: string; href?: string }) => link.title === 'pdf')?.href) || (Array.isArray(entry.link) ? entry.link.find((link: { $: { title?: string; href?: string } }) => link.$.title === 'pdf')?.$.href : entry.link?.$.href),
          summary: analysis.summary,
          tags: analysis.tags,
          categories: paperCategories,
          embedding: embedding,
          publishedDate: entry.published, 
          updatedDate: entry.updated, 
        };
      })
    );
    return processedPapers;

  } catch (error) {
    console.error(`Error fetching papers from category ${categoryToFetch}:`, error);
    return [];
  }
}

export async function fetchLatestPapers(): Promise<Paper[]> {
  const allPapers: Paper[] = [];
  // Using Promise.all to fetch categories in parallel for slight performance improvement
  const categoryPromises = ARXIV_CATEGORIES_TO_FETCH.map(cat => fetchPapersFromCategory(cat));
  const results = await Promise.all(categoryPromises);
  results.forEach(papers => allPapers.push(...papers));

  // Remove duplicates based on title (papers can be in multiple categories)
  const uniquePapers = Array.from(new Map(allPapers.map(paper => [paper.title, paper])).values());

  return uniquePapers;
}

// Function to get the list of categories we are fetching for the dropdown
export function getDisplayCategories(): string[] {
  return ARXIV_CATEGORIES_TO_FETCH;
}

const MAX_PAPERS_FOR_DIGEST_QUERY = 25;

interface ArxivXmlEntryAuthor {
  name: string;
}

interface ArxivXmlEntryLink {
  $: {
    href: string;
    rel?: string;
    title?: string;
    type?: string;
  };
}

interface ArxivXmlEntryCategory {
  $: {
    term: string;
    scheme?: string;
  };
}

interface ArxivXmlEntry {
  id: string;
  updated: string;
  published: string;
  title: string;
  summary: string;
  author: ArxivXmlEntryAuthor | ArxivXmlEntryAuthor[];
  link: ArxivXmlEntryLink | ArxivXmlEntryLink[];
  category: ArxivXmlEntryCategory | ArxivXmlEntryCategory[];
}

export async function fetchPapersBySubmissionDate(dateString: string): Promise<Paper[]> {
  try {
    // dateString is expected in "YYYY-MM-DD" format
    const formattedDate = dateString.replace(/-/g, ''); // Convert to YYYYMMDD
    const dateQuery = `submittedDate:[${formattedDate}0000+TO+${formattedDate}2359]`;
    const apiUrl = `https://export.arxiv.org/api/query?search_query=${dateQuery}&max_results=${MAX_PAPERS_FOR_DIGEST_QUERY}&sortBy=submittedDate&sortOrder=descending`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`ArXiv API request failed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    // Parse the XML response using xml2js
    const result = await parseStringPromise(xmlText, { explicitArray: false });
    const entries = result.feed.entry || [];

    if (!entries || entries.length === 0) {
      console.log(`No papers found for submission date: ${dateString}`);
      return [];
    }

    // Convert to array if single entry
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    // Process papers and get analysis (summary and tags)
    const processedPapers = await Promise.all(
      entriesArray.map(async (entry: ArxivXmlEntry) => {
        const title = entry.title?.replace(/\n/g, ' ').trim() || '';
        const abstract = entry.summary?.replace(/\n/g, ' ').trim() || '';
        const id = entry.id || '';
        const published = entry.published || '';
        const updated = entry.updated || '';
        
        const authors = Array.isArray(entry.author) 
          ? entry.author.map((author: ArxivXmlEntryAuthor) => author.name || 'Unknown Author')
          : [entry.author?.name || 'Unknown Author'];

        const links = Array.isArray(entry.link) ? entry.link : [entry.link].filter(Boolean) as ArxivXmlEntryLink[];
        const pdfLinkObject = links.find((link: ArxivXmlEntryLink) => 
          link?.$.title === 'pdf' || 
          link?.$.rel === 'alternate' && link?.$.type === 'application/pdf' || // More robust check for PDF links
          link?.$.href?.includes('pdf')
        );
        const pdfLink = pdfLinkObject?.$?.href || '';

        const categoriesArray = Array.isArray(entry.category) 
          ? entry.category
          : entry.category ? [entry.category] : [];
        const categories = categoriesArray.map((cat: ArxivXmlEntryCategory) => cat.$.term).filter(Boolean);

        const analysis = await getPaperAnalysis(title, abstract);
        const embedding = await getEmbeddingForText(abstract, id);

        return {
          id,
          title,
          abstract,
          authors,
          pdfLink,
          summary: analysis.summary,
          tags: analysis.tags,
          categories,
          embedding,
          publishedDate: published,
          updatedDate: updated,
        };
      })
    );

    return processedPapers;

  } catch (error) {
    console.error(`Error fetching papers by submission date ${dateString}:`, error);
    return [];
  }
}

async function analyzeDigestWithAI(papers: Paper[]): Promise<DailyDigest> {
  try {
    return await generatePaperDigest(papers);
  } catch (error) {
    console.error('Error analyzing papers for digest:', error);
    throw error;
  }
}

export async function getDigestForDate(dateString: string): Promise<DailyDigest> {
  const papers = await fetchPapersBySubmissionDate(dateString);
  return analyzeDigestWithAI(papers);
} 