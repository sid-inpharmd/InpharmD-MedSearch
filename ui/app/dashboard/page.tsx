'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AWS from 'aws-sdk';
// AWS S3 configuration
const s3 = new AWS.S3({
  region: 'us-east-1',
  credentials: new AWS.Credentials({
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY as string,
  }),
});
// Separate component for PDF viewer
const PDFViewer = React.memo(({ files, currentIndex }: { files: File[], currentIndex: number }) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {files.length > 0 && (
        <iframe
          src={URL.createObjectURL(files[currentIndex])}
          title={`PDF Viewer ${currentIndex}`}
          className="w-full h-full border-0"
        />
      )}
    </div>
  );
});
const DashboardPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Summary Table');
  const [fileData, setFileData] = useState<Map<number, { summaryTableContent: string, overallSummaryContent: string, pdfTablesContent: string }>>(
    new Map()
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Loading states for individual file
  const [loadingStates, setLoadingStates] = useState<Map<number, { summaryTable: boolean, overallSummary: boolean, pdfTables: boolean }>>(
    new Map()
  );
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setCurrentIndex(0); // Reset index when new files are dropped
    window.history.pushState({ files: acceptedFiles }, 'PDF Viewer'); // Push state to history
  }, []);
  useEffect(() => {
    if (files.length > 0) {
      const uploadFilesToS3 = async () => {
        try {
          const uploadedUrls: string[] = [];
          for (const file of files) {
            const params = {
              Bucket: 'inpharmdui',
              Key: `uploads/${file.name}`,
              Body: file,
              ContentType: file.type,
            };
            const uploadResponse = await s3.upload(params).promise();
            console.log('S3 Upload Response:', uploadResponse);
            const pdfUrl = uploadResponse.Location;
            uploadedUrls.push(pdfUrl);
            // Initialize file data and loading states
            setFileData(prev => new Map(prev).set(files.indexOf(file), {
              summaryTableContent: '',
              overallSummaryContent: '',
              pdfTablesContent: '',
            }));
            setLoadingStates(prev => new Map(prev).set(files.indexOf(file), {
              summaryTable: true,
              overallSummary: true,
              pdfTables: true,
            }));
            // Fetch summaries or tables for each PDF in sequence
            await fetchSummaryTable(pdfUrl, files.indexOf(file));
            await fetchPdfTables(pdfUrl, files.indexOf(file));
            await fetchOverallSummary(pdfUrl, files.indexOf(file));
          }
          setUploadedFiles(uploadedUrls);
        } catch (error) {
          console.error('Error uploading file to S3:', error);
        }
      };
      uploadFilesToS3();
    } else {
      window.history.pushState({}, 'Upload Page'); // Reset state when files are cleared
    }
  }, [files]);
  const deleteFilesFromS3 = async () => {
    try {
      for (const fileUrl of uploadedFiles) {
        const key = fileUrl.split('/').slice(-2).join('/'); // Extract the S3 key from the URL
        const params = {
          Bucket: 'inpharmdui',
          Key: key,
        };
        await s3.deleteObject(params).promise();
        console.log(`Deleted ${key} from S3`);
      }
    } catch (error) {
      console.error('Error deleting files from S3:', error);
    }
  };
  useEffect(() => {
    const handleBeforeUnload = async () => {
      await deleteFilesFromS3();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Call cleanup when component unmounts
    };
  }, [uploadedFiles]);
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.files) {
        setFiles(event.state.files);
      } else {
        setFiles([]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  const fetchSummaryTable = async (pdfUrl: string, index: number) => {
    setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), summaryTable: true }));
    try {
      const response = await fetch('https://utils.inpharmd.ai/api/v1/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Summarize all tables in the document.',
          retrieval_type: 'tables',
          pdf_urls: [pdfUrl],
          format: 'html',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch summary table');
      }
      const data = await response.json();
      const summaryTableContent = data[0]?.response || 'No content available';
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        summaryTableContent,
      }));
    } catch (error) {
      console.error('Error fetching summary table:', error);
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        summaryTableContent: 'Error fetching summary table',
      }));
    } finally {
      setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), summaryTable: false }));
    }
  };
  const fetchOverallSummary = async (pdfUrl: string, index: number) => {
    setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), overallSummary: true }));
    try {
      const response = await fetch('https://utils.inpharmd.ai/api/v1/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Provide an overall summary of the document.',
          retrieval_type: 'overview',
          pdf_urls: [pdfUrl],
          format: 'html',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch overall summary');
      }
      const data = await response.json();
      const overallSummaryContent = data[0]?.response || 'No content available';
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        overallSummaryContent,
      }));
    } catch (error) {
      console.error('Error fetching overall summary:', error);
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        overallSummaryContent: 'Error fetching overall summary',
      }));
    } finally {
      setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), overallSummary: false }));
    }
  };
  const fetchPdfTables = async (pdfUrl: string, index: number) => {
    setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), pdfTables: true }));
    try {
      const response = await fetch('https://dev-tables-26dfe08a14e2.herokuapp.com/table2json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: pdfUrl,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch PDF tables');
      }
      const data = await response.json();
      let tablesHtml = '';
      if (Array.isArray(data.Tables)) {
        tablesHtml = data.Tables.map((table: any, tableIndex: number) => {
          const rows = table.Table;
          if (rows) {
            const rowsHtml = Object.values(rows)
              .map((row: any) => {
                const cellsHtml = Object.values(row)
                  .map(
                    (cell: any) =>
                      `<td class="border border-gray-700 px-4 py-2">${String(cell).trim()}</td>`
                  )
                  .join('');
                return `<tr>${cellsHtml}</tr>`;
              })
              .join('');
            if (rowsHtml) {
              return `
                <table key=${tableIndex} class="table-auto w-full border-collapse border border-gray-700 mb-4 text-white">
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              `;
            }
          }
          return '';
        }).join('');
      } else {
        tablesHtml = '<p class="text-white">No tables found in the PDF.</p>';
      }
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        pdfTablesContent: tablesHtml,
      }));
    } catch (error) {
      console.error('Error fetching PDF tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFileData(prev => new Map(prev).set(index, {
        ...prev.get(index),
        pdfTablesContent: `<p class="text-white">Error fetching PDF tables: ${errorMessage}</p>`,
      }));
    } finally {
      setLoadingStates(prev => new Map(prev).set(index, { ...prev.get(index), pdfTables: false }));
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  return (
    <div className="flex h-screen bg-black">
      {files.length > 0 ? (
        <>
          <div className="relative w-1/2 h-full">
            <PDFViewer files={files} currentIndex={currentIndex} />
            {files.length > 1 && (
              <div className="absolute top-1/2 left-0 right-0 flex justify-between items-center px-4">
                <button
                  className="bg-black text-white p-2 rounded-full hover:bg-black"
                  onClick={() => setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  &lt;
                </button>
                <button
                  className="bg-black text-white p-2 rounded-full hover:bg-black"
                  onClick={() => setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, files.length - 1))}
                  disabled={currentIndex === files.length - 1}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
          <div className="w-1/2 p-4 flex flex-col bg-black h-full">
            <div className="flex space-x-10 mb-4 border-b border-black">
              {['Summary Table', 'PDF Tables', 'Overall Summary'].map((option, index) => (
                <div
                  key={index}
                  className={`cursor-pointer py-2 px-4 ${
                    activeTab === option
                      ? 'border-b-2 border-orange-500 text-orange-500'
                      : 'text-white hover:text-orange-500'
                  }`}
                  onClick={() => setActiveTab(option)}
                >
                  {option}
                </div>
              ))}
            </div>
            <div className="text-white p-4 flex-grow overflow-y-auto">
              {activeTab === 'Summary Table' && (
                loadingStates.get(currentIndex)?.summaryTable ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-lg font-bold mb-4">Loading...</div>
                    <div className="w-8 h-8 border-4 border-t-4 border-white border-solid rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div
                    className="prose prose-invert"
                    dangerouslySetInnerHTML={{ __html: fileData.get(currentIndex)?.summaryTableContent || '' }}
                  />
                )
              )}
              {activeTab === 'PDF Tables' && (
                loadingStates.get(currentIndex)?.pdfTables ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-lg font-bold mb-4">Loading...</div>
                    <div className="w-8 h-8 border-4 border-t-4 border-white border-solid rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div
                    className="prose prose-invert"
                    dangerouslySetInnerHTML={{ __html: fileData.get(currentIndex)?.pdfTablesContent || '' }}
                  />
                )
              )}
              {activeTab === 'Overall Summary' && (
                loadingStates.get(currentIndex)?.overallSummary ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-lg font-bold mb-4">Loading...</div>
                    <div className="w-8 h-8 border-3 border-t-3 border-white border-solid rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div
                    className="prose prose-invert"
                    dangerouslySetInnerHTML={{ __html: fileData.get(currentIndex)?.overallSummaryContent || '' }}
                  />
                )
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center w-full max-w-xl p-16 border-2 border-dashed rounded-lg cursor-pointer bg-black m-auto transition-colors duration-300 ${
            isDragActive ? 'border-orange-500' : 'border-gray-600'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-white">
            <CloudUploadIcon style={{ fontSize: 80 }} className="mb-4 text-orange-500" />
            <p className="mb-2 text-2xl">Drag & drop to upload</p>
            <p className="text-lg mt-2">
              or <span className="text-orange-500 underline">browse</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardPage;
