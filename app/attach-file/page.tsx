'use client';
import React, { useEffect, useState } from 'react';

const AttachFilePage = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null); // Track the active tab

  useEffect(() => {
    const storedFile = localStorage.getItem('selectedFile');
    if (storedFile) {
      setFileUrl(storedFile);
      const mimeType = storedFile.match(/data:(.*);base64,/)?.[1];
      setFileType(mimeType || null);
    }

    return () => localStorage.removeItem('selectedFile');
  }, []);

  return (
    <div className="flex max-w-6xl mx-auto h-screen">
      <div className="w-1/2 p-4">
        {fileUrl && (
          <div className="h-full overflow-auto">
            {fileType?.startsWith('image/') && (
              <img
                src={fileUrl}
                alt="Preview"
                className="w-full h-auto object-contain"
              />
            )}
            {fileType === 'application/pdf' && (
              <iframe
                src={fileUrl}
                title="PDF Preview"
                className="w-full h-full border-none"
              />
            )}
            {!fileType?.startsWith('image/') && fileType !== 'application/pdf' && (
              <p>File type not supported for preview: {fileType}</p>
            )}
          </div>
        )}
      </div>

      {fileUrl && (
        <div className="w-1/2 p-4 flex flex-col items-start">
          <div className="flex w-full justify-between space-x-4">
            <button
              className="text-white hover:text-gray-400 text-sm flex-grow py-2 whitespace-nowrap"
              onClick={() => setActiveTab('summary-table')}
            >
              Summary Table
            </button>
            <button
              className="text-white hover:text-gray-400 text-sm flex-grow py-2 whitespace-nowrap"
              onClick={() => setActiveTab('pdf-tables')}
            >
              PDF Tables
            </button>
            <button
              className="text-white hover:text-gray-400 text-sm flex-grow py-2 whitespace-nowrap"
              onClick={() => setActiveTab('overall-summary')}
            >
              Overall Summary
            </button>
            <button
              className="text-white hover:text-gray-400 text-sm flex-grow py-2 whitespace-nowrap"
              onClick={() => setActiveTab('new-extraction-summary')}
            >
              New Extraction Summary
            </button>
            <button
              className="text-white hover:text-gray-400 text-sm flex-grow py-2 whitespace-nowrap"
              onClick={() => setActiveTab('new-table-extraction')}
            >
              New Table Extraction
            </button>
          </div>

          {/* Render content based on active tab */}
          <div className="mt-4 w-full">
            {activeTab === 'summary-table' && (
              <div>
                <h2 className="text-lg font-bold">Summary Table</h2>
                <p>This is the content for the Summary Table.</p>
              </div>
            )}
            {activeTab === 'pdf-tables' && (
              <div>
                <h2 className="text-lg font-bold">PDF Tables</h2>
                <p>This is the content for the PDF Tables.</p>
              </div>
            )}
            {activeTab === 'overall-summary' && (
              <div>
                <h2 className="text-lg font-bold">Overall Summary</h2>
                <p>This is the content for the Overall Summary.</p>
              </div>
            )}
            {activeTab === 'new-extraction-summary' && (
              <div>
                <h2 className="text-lg font-bold">New Extraction Summary</h2>
                <p>This is the content for the New Extraction Summary.</p>
              </div>
            )}
            {activeTab === 'new-table-extraction' && (
              <div>
                <h2 className="text-lg font-bold">New Table Extraction</h2>
                <p>This is the content for the New Table Extraction.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachFilePage;