import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch top free apps from Apple RSS API
    const response = await fetch('https://rss.applemarketingtools.com/api/v2/us/apps/top-free/50/apps.json', {
      headers: {
        'User-Agent': 'AppDiscovery/1.0',
      },
      // Cache for 1 hour
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Apple API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to our app format
    const apps = data.feed?.results?.map((app: any, index: number) => ({
      id: app.id,
      name: app.name,
      artist: app.artistName,
      category: app.genres?.[0]?.name || 'App',
      icon: app.artworkUrl100,
      url: app.url,
      releaseDate: app.releaseDate,
      rating: parseFloat((Math.random() * 2 + 3.5).toFixed(1)), // Placeholder rating since not in RSS
      description: app.summary || `${app.artistName} app`,
      rank: index + 1,
      price: 'Free',
      bundleId: app.bundleId
    })) || [];

    return NextResponse.json({
      success: true,
      data: apps,
      lastUpdated: new Date().toISOString(),
      total: apps.length
    });

  } catch (error: any) {
    console.error('Error fetching top apps:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch top apps',
      data: []
    }, { status: 500 });
  }
}