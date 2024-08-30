'use client';

import { useState, useEffect } from 'react';

const DiscoverPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedQuery = localStorage.getItem('searchQuery');
    const savedResults = localStorage.getItem('searchResults');

    if (savedQuery && savedResults) {
      setQuery(savedQuery);
      setResults(JSON.parse(savedResults));
    }
  }, []);

  const fetchArticleContent = async (url) => {
    try {
      const res = await fetch(url);
      const html = await res.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const section = doc.querySelector('#inquiry-response-question');
      const pTag = section ? section.querySelector('p') : null;
      return pTag ? pTag.textContent : 'No Title Available';
    } catch (error) {
      console.error('Error fetching article content:', error);
      return 'Failed to Load Title';
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query) {
      setError('Please enter a query.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('https://inpharmd.ai/api/v2/inpharmd_search?access_token=d8549b1eba0eab87fafd383bec0c27e0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: query,
          top_k: 6,  // Set to fetch 6 results
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const matches = data.matches || [];

        const formattedResults = await Promise.all(matches.map(async (match) => {
          const title = await fetchArticleContent(match.metadata.source);
          return {
            source: match.metadata.source,
            title: title || 'No Title', // Use the fetched title or a default title
          };
        }));

        setResults(formattedResults);

        // Save the query and results to localStorage
        localStorage.setItem('searchQuery', query);
        localStorage.setItem('searchResults', JSON.stringify(formattedResults));
      } else {
        setError('Failed to fetch results.');
      }
    } catch (error) {
      setError('Error fetching results.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-black text-white">
      <h1 className="text-3xl font-bold mt-8 mb-4 text-[#FFA500]">Discover</h1>
      <form onSubmit={handleSearch} className="w-full max-w-lg flex space-x-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-[#FFA07A] bg-black text-white rounded"
          placeholder="Enter your search query..."
        />
        <button
          type="submit"
          className="px-6 py-2 bg-[#FF8C00] text-white font-semibold rounded hover:bg-[#FF7F50] transition duration-200"
        >
          Search
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center">
          {/* Spinner */}
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-gray-200 animate-spin fill-[#FF8C00]"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
        </div>
      )}

      {error && (
        <p className="text-red-500">{error}</p>
      )}

      <div className="w-full max-w-6xl flex flex-wrap justify-center">
        {results.length > 0 && results.map((result, i) => (
          <div key={i} className="w-full sm:w-1/3 p-2">
            <div className="border border-[#FFA07A] rounded-lg shadow bg-[#333333] h-64 flex flex-col justify-between p-4">
              <h2 className="text-lg font-semibold text-white mb-2">{result.title}</h2>
              <button
                onClick={() => window.open(result.source, '_blank')}
                className="px-4 py-2 bg-[#FF8C00] text-white font-semibold rounded hover:bg-[#FF7F50] transition duration-200"
              >
                View Article
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && !error && (
        <p className="text-gray-500">No results found.</p>
      )}
    </div>
  );
};

export default DiscoverPage;