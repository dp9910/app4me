
'use client';

import { useSearchParams } from 'next/navigation';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  return (
    <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <a className="hover:text-primary" href="/">AppFinder</a>
          <span>/</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">Search Results</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Search Results for "{query}"
        </h1>
        <div className="mt-8">
          <p className="text-gray-600 dark:text-gray-400">
            {query ? `Showing results for "${query}"` : 'No search query provided'}
          </p>
        </div>
      </div>
    </main>
  );
}
