import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://itunes.apple.com/us/rss/topfreeapplications/limit=25/json');
    if (!response.ok) {
      throw new Error('Failed to fetch top weekly apps from iTunes');
    }

    const data = await response.json();
    const results = data.feed.entry || [];

    const transformedApps = results.map((app: any, index: number) => ({
      id: app.id.attributes['im:id'],
      name: app['im:name'].label,
      artist: app['im:artist'].label,
      category: app.category.attributes.label,
      icon: app['im:image'][2].label.replace('100x100bb.png', '512x512bb.png'),
      url: app.link.attributes ? app.link.attributes.href : app.link,
      rating: 0, // Not available in this feed
      description: app.summary.label,
      rank: index + 1,
      price: app['im:price'].label === 'Get' ? 'Free' : app['im:price'].attributes.amount,
    }));

    return NextResponse.json({ success: true, data: transformedApps });

  } catch (error: any) {
    console.error('Error fetching top weekly apps:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch top weekly apps' }, { status: 500 });
  }
}
