# Synapse Lite

A minimal prototype of a swarm-powered AI scientist focused on fresh papers from ArXiv. The system uses a combination of AI agents to analyze, summarize, generate insights, and validate research papers in the fields of AI, Machine Learning, and Statistics.

## Features

- **Papers Tab**: Browse and analyze the latest papers from ArXiv (cs.AI, cs.LG, stat.ML)
  - Real-time paper fetching and analysis
  - AI-powered paper summaries and insights
  - Interactive chat interface for paper discussions
  
- **Digests Tab**: Get AI-curated daily digests of research papers
  - Top 5 most significant papers with explanations
  - Emerging themes and trends analysis
  - Interesting outlier papers identification
  - Daily key takeaways

## Quick Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd synapse
```

2. Create a `.env.local` file in the root directory with your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key
```

3. Run the setup script:
```bash
./setup.sh
```

The application will be available at `http://localhost:3000`.

## Swarm Lifecycle

The Synapse Lite swarm operates through several coordinated AI agents:

1. **Paper Collection Agent**
   - Fetches latest papers from ArXiv in specified categories
   - Filters and preprocesses paper metadata
   - Caches paper content for efficient retrieval

2. **Analysis Agent**
   - Generates concise paper summaries (350-450 words)
   - Extracts key topics and techniques
   - Tags papers with relevant categories
   - Confidence scoring for validity assessment

3. **Validity Agent**
   - Analyzes papers for potential issues and inconsistencies
   - Identifies suspicious claims or methodological concerns
   - Suggests areas needing further verification

4. **Chat Agent**
   - Provides interactive paper discussions
   - Answers questions using paper context
   - Maintains conversation history
   - Streams responses in real-time

5. **Digest Agent**
   - Analyzes papers in batch for daily digests
   - Identifies significant papers and emerging trends
   - Highlights cross-disciplinary connections
   - Generates daily key takeaways

## Known Gaps and Limitations

1. **Paper Processing**
   - Limited to papers available through ArXiv
   - PDF parsing can be unreliable for complex mathematical notation
   - Currently only processes the first 15,000 characters of each paper

2. **Analysis Depth**
   - Summaries may miss some technical details
   - Analysis is primarily based on abstract and introduction
   - Limited cross-referencing between papers

## Technical Stack

- **Frontend**: Next.js 15.3.2, React 19, TailwindCSS
- **APIs**: ArXiv, OpenAI
- **Development**: TypeScript, ESLint, Turbopack

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
