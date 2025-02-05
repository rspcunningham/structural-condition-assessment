'use client';

import { useState, ChangeEvent, DragEvent, RefObject, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
  component_type: string;
  condition_grade: number;
  condition_description: string;
  maintenance_recommendations: string;
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isShowingReport, setIsShowingReport] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

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

  // Analysis function
  const analyzeImage = async (file: File): Promise<AnalysisResult> => {
    // TODO: Replace with actual API call to your analysis service
    // This is just a mock response for demonstration
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          component_type: "well pressure tank",
          condition_grade: 3,
          condition_description: "The tank exhibits moderate wear with visible scuff marks and signs of rust near fittings. There is no apparent severe damage or active leaking, but the exterior surface and connections indicate aging components.",
          maintenance_recommendations: "Inspect all fittings for hidden corrosion or leakage, clean and treat rusted areas, and verify proper pressure settings. Schedule a more thorough inspection and pressure test to ensure continued safe operation."
        });
      }, 1500);
    });
  };

  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;
    
    setIsAnalyzing(true);
    const results = await Promise.all(
      selectedFiles.map(file => analyzeImage(file))
    );
    setAnalysisResults(results);
  };

  const handleGenerateReport = () => {
    setIsShowingReport(true);
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Exporting PDF...');
  };

  if (isShowingReport) {
    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Structural Analysis Report</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsShowingReport(false)}
              className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-2 text-sm hover:border-black/[.15] dark:hover:border-white/[.25]"
            >
              Back to Analysis
            </button>
            <button
              onClick={handleExportPDF}
              className="rounded-full border border-transparent bg-foreground text-background px-6 py-2 text-sm hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div ref={reportRef} className="max-w-4xl mx-auto space-y-8 pb-8">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-black/[.08] dark:border-white/[.145] pb-6">
              <div>
                <h1 className="text-2xl font-bold mb-4">Structural Analysis Report</h1>
                <p className="text-sm text-gray-500">Report Generated: {new Date().toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Total Components Analyzed: {analysisResults.length}</p>
              </div>
              {/* Logo */}
              <div className="w-20 h-20">
                <img 
                  src="/logo.svg" 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Introduction Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium">Introduction</h2>
              <div className="prose prose-sm dark:prose-invert">
                <p>
                  This structural integrity analysis report provides a comprehensive assessment 
                  of various building components and infrastructure elements. The analysis was 
                  conducted using advanced visual inspection techniques and automated assessment 
                  tools to identify potential issues and maintenance requirements.
                </p>
                <p>
                  Each component has been thoroughly examined for signs of wear, damage, or 
                  deterioration. The report includes detailed observations and specific 
                  maintenance recommendations for each analyzed component.
                </p>
              </div>
            </div>

            {/* Components Analysis Section */}
            <div className="space-y-12">
              <h2 className="text-xl font-medium">Component Analysis</h2>
              {analysisResults.map((result, index) => (
                <div key={index} className="space-y-8">
                  <h3 className="text-lg font-medium capitalize">
                    {result.component_type}
                  </h3>

                  {/* Centered image and caption */}
                  <div className="flex flex-col items-center">
                    <div className="w-1/2 aspect-square">
                      <img
                        src={URL.createObjectURL(selectedFiles[index])}
                        alt={selectedFiles[index].name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{selectedFiles[index].name}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Condition Assessment</h4>
                      <p className="text-sm mt-1">{result.condition_description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Recommended Actions</h4>
                      <p className="text-sm mt-1">{result.maintenance_recommendations}</p>
                    </div>
                  </div>

                  {index < analysisResults.length - 1 && (
                    <div className="border-b border-black/[.08] dark:border-white/[.145]" />
                  )}
                </div>
              ))}
            </div>

            {/* Report Summary */}
            <div className="border-t border-black/[.08] dark:border-white/[.145] pt-6">
              <h2 className="text-lg font-medium mb-4">Summary</h2>
              <p className="text-sm">
                This report details the structural analysis of {analysisResults.length} components. 
                Maintenance recommendations have been provided based on the condition assessment 
                of each component. Regular monitoring and implementation of the recommended 
                actions will help maintain the structural integrity and longevity of the analyzed components.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="w-96 flex-none flex flex-col overflow-y-auto">
              <h2 className="text-lg font-medium truncate mb-4">
                {selectedFiles[selectedImageIndex].name}
              </h2>
              <div className="bg-black/[.03] dark:bg-white/[.03] p-6 rounded-lg flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Component Type</h3>
                  <p className="text-base capitalize">{analysisResults[selectedImageIndex].component_type}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Condition Grade</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white
                      ${analysisResults[selectedImageIndex].condition_grade <= 2 ? 'bg-green-500' :
                        analysisResults[selectedImageIndex].condition_grade === 3 ? 'bg-yellow-500' :
                        'bg-red-500'}`}>
                      {analysisResults[selectedImageIndex].condition_grade}
                    </span>
                    <span className="text-sm text-gray-500">
                      {analysisResults[selectedImageIndex].condition_grade <= 2 ? 'Good' :
                        analysisResults[selectedImageIndex].condition_grade === 3 ? 'Fair' :
                        'Poor'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Condition Description</h3>
                  <p className="text-sm">{analysisResults[selectedImageIndex].condition_description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Maintenance Recommendations</h3>
                  <p className="text-sm">{analysisResults[selectedImageIndex].maintenance_recommendations}</p>
                </div>
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
