import { NextResponse } from 'next/server';
import { getDigestForDate } from '@/lib/arxiv';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    const digest = await getDigestForDate(date);
    return NextResponse.json(digest);
  } catch (error) {
    console.error(`Error generating digest for date ${date}:`, error);
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
} 