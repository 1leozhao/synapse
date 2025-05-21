import { NextResponse } from 'next/server';
import { fetchPapersBySubmissionDate } from '@/lib/arxiv';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    const papers = await fetchPapersBySubmissionDate(date);
    return NextResponse.json(papers);
  } catch (error) {
    console.error(`Error fetching papers for date ${date}:`, error);
    return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 });
  }
} 