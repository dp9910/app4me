import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://rss.applemarketingtools.com/api/v2/us/apps/top-free/25/apps.json');
    if (!response.ok) {
      throw new Error('Failed to fetch top weekly apps from iTunes');
    }

    const data = await response.json();
    const results = data.feed.results || [];

    const transformedApps = results.map((app: any, index: number) => ({
      id: app.id,
      name: app.name,
      artist: app.artistName,
      category: app.genres.length > 0 ? app.genres[0].name : 'App',
      icon: app.artworkUrl100.replace('100x100bb.png', '512x512bb.png'),
      url: app.url,
      rating: 0, // Not available in this feed
      description: '', // Not available in this feed
      rank: index + 1,
      price: 'Free',
    }));

    return NextResponse.json({ success: true, data: transformedApps });

  } catch (error: any) {
    console.error('Error fetching top weekly apps:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch top weekly apps' }, { status: 500 });
  }
}
