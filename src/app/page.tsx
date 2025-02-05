'use client';

import { useState, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const router = useRouter();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (event.dataTransfer.files) {
      setSelectedFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;
    
    setIsAnalyzing(true);
    // TODO: Implement actual analysis logic here
    // For demo, we'll just set some sample results after a delay
    setTimeout(() => {
      setAnalysisResults(selectedFiles.map(file => `Sample analysis result for ${file.name}`));
    }, 1500);
  };

  const handleGenerateReport = async (): Promise<void> => {
    // TODO: Implement report generation logic
    console.log('Generating report for results:', analysisResults);
  };

  if (isAnalyzing && analysisResults.length > 0) {
    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        <h1 className="text-2xl font-bold text-center mb-6">Analysis Results</h1>
        
        <div className="w-full h-full flex gap-6 max-h-[calc(100vh-180px)]">
          {/* Scrollable thumbnail gallery with adjusted scrollbar position */}
          <div className="w-32 flex-none overflow-y-auto hover:overflow-y-auto">
            <div className="flex flex-col gap-3 px-2 py-2 pr-4">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer flex-none
                    ${selectedImageIndex === index 
                      ? 'ring-2 ring-foreground ring-offset-1' 
                      : 'hover:ring-2 hover:ring-foreground/50 hover:ring-offset-1'}`}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex gap-6 h-full">
            {/* Selected image */}
            <div className="flex-1 bg-black/[.03] dark:bg-white/[.03] rounded-lg overflow-hidden">
              <img
                src={URL.createObjectURL(selectedFiles[selectedImageIndex])}
                alt={selectedFiles[selectedImageIndex].name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Analysis details */}
            <div className="w-80 flex-none flex flex-col">
              <h2 className="text-lg font-medium truncate mb-4">
                {selectedFiles[selectedImageIndex].name}
              </h2>
              <div className="bg-black/[.03] dark:bg-white/[.03] p-4 rounded-lg flex-1">
                <p className="text-sm">{analysisResults[selectedImageIndex]}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={() => {
              setIsAnalyzing(false);
              setAnalysisResults([]);
              setSelectedFiles([]);
            }}
            className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-2 text-sm hover:border-black/[.15] dark:hover:border-white/[.25]"
          >
            New Analysis
          </button>
          <button
            onClick={handleGenerateReport}
            className="rounded-full border border-transparent bg-foreground text-background px-6 py-2 text-sm hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Generate Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Structural Integrity Analysis</h1>
        
        <div className="flex flex-col items-center gap-6 w-full">
          <div 
            className={`w-full aspect-[3/2] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors
              ${isDragging 
                ? 'border-foreground bg-black/[.03] dark:bg-white/[.03]' 
                : 'border-black/[.08] dark:border-white/[.145] hover:border-black/[.15] dark:hover:border-white/[.25]'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <svg 
                className="w-8 h-8 mb-4 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="text-sm font-medium mb-1">Click to upload or drag and drop</span>
              <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</span>
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="w-full bg-black/[.03] dark:bg-white/[.03] rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Selected files:</h3>
              <ul className="text-sm space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="text-gray-500">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
            className={`rounded-full border border-solid transition-colors flex items-center justify-center gap-2 text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10 w-full max-w-[200px]
              ${selectedFiles.length > 0
                ? 'border-transparent bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]' 
                : 'border-black/[.08] dark:border-white/[.145] bg-[#f2f2f2] dark:bg-[#1a1a1a] text-gray-400 cursor-not-allowed'
              }`}
          >
            Begin Analysis
          </button>
        </div>
      </main>

      <footer className="row-start-3 text-sm text-center text-gray-500">
        Upload images to generate an analysis report
      </footer>
    </div>
  );
}
