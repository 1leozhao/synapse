import OpenAI from 'openai';
import fetch from 'node-fetch'; // For making HTTP requests to arxiv-txt.org
import { DailyDigest, Paper } from './arxiv';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PaperCritique {
  analysis: string;
  isValid: boolean;
  confidenceScore: number;
}

export async function generatePaperCritique(abstract: string, detailedSummary: string): Promise<PaperCritique> {
  const prompt = `As a scientific validity checker, analyze the following paper's abstract and detailed summary for potential issues, inconsistencies, or suspicious claims.

IMPORTANT CONTEXT: Papers published on arXiv have already undergone basic screening. Historically, less than 5% of arXiv papers contain serious validity issues. Therefore, papers should be considered valid by default unless there are clear and significant issues with methodology, claims, or data presentation that violate academic standards.

Abstract:
${abstract}

Detailed Summary:
${detailedSummary}

Please evaluate:
1. The consistency between the abstract and detailed summary
2. The validity of numerical claims and statistics
3. The soundness of methodological approaches
4. Any potential red flags or suspicious elements

Only mark a paper as invalid if you find serious issues that significantly impact the paper's credibility (which occurs in <5% of cases). Minor limitations or areas for improvement should not result in an invalid classification.

Provide your analysis in the following JSON format:
{
  "analysis": "2-3 sentences analyzing the paper's validity, followed by a simple one-sentence conclusion starting with 'Overall, ' that clearly states if the paper appears valid or not.",
  "isValid": boolean, // true if paper meets basic academic standards (>95% of papers should), false only if serious issues found
  "confidenceScore": number // 0-1 score indicating your confidence in this assessment
}

IMPORTANT: The analysis MUST end with a simple, clear concluding sentence starting with 'Overall, ' that states whether the paper appears valid or not. Keep this conclusion brief and straightforward. Remember that most papers (>95%) should be considered valid unless there are significant issues.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const resultString = completion.choices[0]?.message?.content;
    if (!resultString) throw new Error('OpenAI response content is null or undefined.');
    
    return JSON.parse(resultString);
  } catch (error) {
    console.error("Error generating paper critique:", error);
    return {
      analysis: "Could not generate critique due to an error.",
      isValid: true, // Default to true in case of errors
      confidenceScore: 0
    };
  }
}

interface PaperAnalysis {
  summary: string; // This is the abstract-based summary
  tags: string[];
}

// Cache for abstract-based analysis
const analysisCache = new Map<string, PaperAnalysis>();
// Cache for full-text based summary
const fullSummaryCache = new Map<string, string>();
const embeddingCache = new Map<string, number[]>(); // Cache for embeddings (abstract_hash -> embedding)

// Function to extract core ArXiv ID (e.g., "2408.04406v2") from URL (e.g., "http://arxiv.org/abs/2408.04406v2")
function extractCoreArxivId(arxivUrl: string): string | null {
  const match = arxivUrl.match(/abs\/(.+)/);
  return match ? match[1] : null;
}

async function analyzePaperWithOpenAI(title: string, abstract: string): Promise<PaperAnalysis> {
  if (analysisCache.has(title)) {
    return analysisCache.get(title)!;
  }

  const prompt = `Paper Title: "${title}"
Paper Abstract: "${abstract}"

Based on the title and abstract, please provide:
1. A concise summary of the paper in no more than 150 words.
2. A list of 3-5 key topics or techniques mentioned in the paper (e.g., "diffusion models", "RLHF", "LoRA"). Format as a JSON array of strings.

Output in the following JSON format:
{
  "summary": "<summary_here>",
  "tags": ["<tag1>", "<tag2>", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const resultString = completion.choices[0]?.message?.content;
    if (!resultString) throw new Error('OpenAI response content is null or undefined.');
    const parsedResult: PaperAnalysis = JSON.parse(resultString);
    analysisCache.set(title, parsedResult);
    return parsedResult;
  } catch (error) {
    console.error("Error analyzing paper (abstract) with OpenAI:", error);
    return { summary: "Could not generate abstract summary.", tags: ["error"] };
  }
}

export async function getPaperAnalysis(title: string, abstract: string): Promise<PaperAnalysis> {
  if (abstract.length < 50) return { summary: "Abstract too short for initial analysis.", tags: [] };
  return analyzePaperWithOpenAI(title, abstract);
}

export async function generateFullPaperSummaryFromUrl(arxivUrl: string): Promise<string> {
  const coreId = extractCoreArxivId(arxivUrl);
  if (!coreId) {
    console.error("Could not extract core ArXiv ID from URL:", arxivUrl);
    return "Error: Invalid ArXiv URL provided for full summary.";
  }

  if (fullSummaryCache.has(coreId)) {
    return fullSummaryCache.get(coreId)!;
  }

  const arxivTxtUrl = `https://arxiv-txt.org/raw/pdf/${coreId}`;
  let paperText = '';

  try {
    // console.log(`Fetching full text for ${coreId} from ${arxivTxtUrl}`)
    const response = await fetch(arxivTxtUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch paper text from ${arxivTxtUrl}: ${response.statusText}`);
    }
    paperText = await response.text();
    if (paperText.trim().length < 200) { // Arbitrary threshold for too short text
        // console.warn(`Fetched text for ${coreId} seems too short. Length: ${paperText.trim().length}`);
        // return "Fetched paper text is too short to generate a meaningful summary.";
    }
  } catch (error) {
    console.error(`Error fetching paper text for ${coreId}:`, error);
    return "Could not fetch the full paper text for summarization.";
  }

  const prompt = `The following is the full text of a research paper:

${paperText.substring(0, 15000)}ρια  

Please provide a comprehensive yet concise summary of this paper (350-450 words ideal, maximum 500 words). Your summary should:

1. Capture all essential elements of the paper including:
   - Core methodology and approach
   - Key findings and results
   - Main conclusions and implications
   - Important technical details and metrics
   - Limitations and future work

2. Be thorough yet efficient with words:
   - Aim for 350-450 words (this is the sweet spot for balancing detail and readability)
   - Never exceed 500 words
   - Do not sacrifice critical information despite length constraints

3. Focus on what matters:
   - Emphasize novel contributions and key insights
   - Include specific numbers and metrics where relevant
   - Explain complex concepts clearly but concisely
   - Highlight practical implications and real-world impact

Remember: Your goal is to create a summary that could serve as a detailed substitute for reading the full paper, while staying within the word limit.

Summary (350-450 words):`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 700, // Allows for a ~500 word summary + some buffer
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('OpenAI full summary response content is null or undefined.');
    }
    
    fullSummaryCache.set(coreId, summary);
    return summary;

  } catch (error) {
    console.error(`Error generating full paper summary for ${coreId} with OpenAI:`, error);
    return "Could not generate the full paper summary using AI.";
  }
}

export async function getEmbeddingForText(text: string, cacheKey: string): Promise<number[] | null> {
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }
  if (!text || text.trim().length < 50) { // Avoid embedding very short or empty texts
    // console.warn("Text too short for embedding, cacheKey:", cacheKey);
    return null;
  }
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // A common and cost-effective choice
      input: text.trim(),
    });
    const embedding = response.data[0]?.embedding;
    if (embedding) {
      embeddingCache.set(cacheKey, embedding);
      return embedding;
    }
    return null;
  } catch (error) {
    console.error("Error generating embedding with OpenAI, cacheKey:", cacheKey, error);
    return null;
  }
}

function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return new Date().toISOString().split('T')[0];
  try {
    return dateString.split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

interface TopPaperAnalysis {
  id: string;
  significance: string;
}

interface ThemeAnalysis {
  theme: string;
  description: string;
  relatedPaperIds: string[];
}

interface OutlierPickAnalysis {
  paperId: string;
  whyInteresting: string;
}

interface DigestAnalysisFromAI {
  topPapers: TopPaperAnalysis[];
  emergingThemes: ThemeAnalysis[];
  outlierPick: OutlierPickAnalysis;
  keyTakeaway?: string;
}

export async function generatePaperDigest(papers: Paper[]): Promise<DailyDigest> {
  if (!papers || papers.length === 0) {
    throw new Error('No papers provided for digest generation');
  }

  const date = formatDate(papers[0].publishedDate);

  const papersContext = papers.map(p => `
ID: ${p.id}
Title: ${p.title}
Authors: ${p.authors.join(', ')}
Categories: ${p.categories?.join(', ')}
Abstract: ${p.abstract}
---
`).join('\n');

  const systemPrompt = `You are a research curator tasked with creating an insightful daily digest of academic papers. 
Analyze the provided papers and create a structured digest with the following:

1. Top 5 most significant papers, explaining why each matters to the field
2. 2-3 emerging themes or trends across the papers
3. One interesting outlier paper that takes a unique approach or makes an unexpected connection

IMPORTANT: When referencing papers in your response, you MUST use the exact paper IDs provided in the input.
Each paper entry starts with "ID:" - use these exact IDs in your JSON response.

Focus on highlighting novel contributions, practical applications, and cross-disciplinary insights.`;

  const userPrompt = `Here are the papers to analyze:

${papersContext}

Please provide the digest in the following JSON format. IMPORTANT: Use the exact paper IDs from the input:
{
  "topPapers": [
    {
      "id": "<exact ID from input>",
      "significance": "Explanation of why this paper is significant"
    }
  ],
  "emergingThemes": [
    {
      "theme": "Theme name",
      "description": "Theme description",
      "relatedPaperIds": ["<exact IDs from input>"]
    }
  ],
  "outlierPick": {
    "paperId": "<exact ID from input>",
    "whyInteresting": "Explanation of what makes this paper unique or surprising"
  },
  "keyTakeaway": "A single compelling sentence that captures the most important development or trend from today\'s papers."
}

Remember: Only use paper IDs that were provided in the input above.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const analysis: DigestAnalysisFromAI = JSON.parse(completion.choices[0].message.content || '{}');
    
    const validPaperIds = new Set(papers.map(p => p.id));
    
    const validTopPapers = analysis.topPapers.filter((top: TopPaperAnalysis) => validPaperIds.has(top.id));
    if (validTopPapers.length === 0 && analysis.topPapers.length > 0) { 
      // console.warn('AI returned top papers, but none had valid IDs matching input papers.');
      // Decide if this should be a hard error or if we proceed without top papers
      // For now, let's allow proceeding but it might be better to throw
    }

    const validThemes = analysis.emergingThemes.map((theme: ThemeAnalysis) => ({
      ...theme,
      relatedPaperIds: theme.relatedPaperIds.filter((id: string) => validPaperIds.has(id))
    })).filter((theme: ThemeAnalysis) => theme.relatedPaperIds.length > 0);

    let outlierPaperId = analysis.outlierPick.paperId;
    let outlierReason = analysis.outlierPick.whyInteresting;

    if (!validPaperIds.has(analysis.outlierPick.paperId)) {
      // console.warn(`Outlier paper ID "${analysis.outlierPick.paperId}" not found in provided papers. Attempting to use the last paper as a fallback.`);
      if (papers.length > 0) {
        outlierPaperId = papers[papers.length - 1].id;
        outlierReason = "This paper was selected as a fallback outlier as the original pick was not valid.";
      } else {
        // This case should ideally not happen if we have papers for the digest
        console.error("No papers available to select a fallback outlier.");
        // Handle this case: maybe return an error or a digest without an outlier
        // For now, the structure expects an outlier, so this might lead to issues later if paper is undefined.
      }
    }
    
    const outlierPaper = papers.find(p => p.id === outlierPaperId);
    if (!outlierPaper && papers.length > 0) {
        // This would happen if the fallback ID (last paper) somehow also became invalid or papers array was empty.
        // This is an edge case but good to be defensive.
        console.error("Could not find even the fallback outlier paper. Using first paper as absolute fallback.");
        const firstPaper = papers[0]; // if papers has length > 0, this is safe
        outlierPaperId = firstPaper.id;
        outlierReason = "Emergency fallback: original outlier and first fallback were invalid.";
    }

    const digest: DailyDigest = {
      date,
      topPapers: validTopPapers.map((top: TopPaperAnalysis) => {
        const paper = papers.find(p => p.id === top.id)!; // Safe due to prior filtering
        return {
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract,
          significance: top.significance,
          categories: paper.categories || [],
          pdfLink: paper.pdfLink
        };
      }),
      emergingThemes: validThemes,
      outlierPick: {
        paper: (() => {
          const foundPaper = papers.find(p => p.id === outlierPaperId);
          if (!foundPaper) {
            // This is a critical fallback if the outlierPaperId is somehow still not in the list
            // which implies a logic error earlier or an empty 'papers' array passed to generatePaperDigest initially.
            // For robustness, we should ensure 'papers' is not empty at the start of this function.
            // If 'papers' is guaranteed to be non-empty, this fallback might indicate an issue with outlierPaperId selection.
            console.error("CRITICAL: Outlier paper ID not found in final mapping. Defaulting to a placeholder structure or the first paper if available.");
            if (papers.length > 0) {
                const firstPaper = papers[0];
                 return {
                    id: firstPaper.id,
                    title: firstPaper.title,
                    abstract: firstPaper.abstract,
                    significance: "Placeholder: Error in identifying specific outlier.",
                    categories: firstPaper.categories || [],
                    pdfLink: firstPaper.pdfLink
                };
            }
            // If papers is empty, this will be problematic. The function should throw earlier.
            // Returning a dummy structure to satisfy type, but this indicates a deeper issue.
            return { id: "error", title: "Error", abstract: "Error", significance: "Error", categories: [], pdfLink: "" };
          }
          return {
            id: foundPaper.id,
            title: foundPaper.title,
            abstract: foundPaper.abstract,
            significance: outlierReason, // Use the potentially updated reason
            categories: foundPaper.categories || [],
            pdfLink: foundPaper.pdfLink
          };
        })(),
        whyInteresting: outlierReason
      },
      keyTakeaway: analysis.keyTakeaway || "Key developments in AI research across multiple domains."
    };

    return digest;
  } catch (error) {
    console.error('Error generating paper digest:', error);
    throw error;
  }
}

export {
  // ... existing code ...
} 