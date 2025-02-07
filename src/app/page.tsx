'use client';

import { useState, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { analyseImage, AnalysisResult } from '@/lib/analysis';

interface Annotation {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isShowingReport, setIsShowingReport] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [siteAddress, setSiteAddress] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleUpload(Array.from(event.target.files));
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
      handleUpload(Array.from(event.dataTransfer.files));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = (files: File[]) => {
    setSelectedFiles(files);
    setAnnotations(new Array(files.length).fill([]));
    setImageDescriptions(new Array(files.length).fill(''));
    setIsAnnotating(true);
    setCurrentImageIndex(0);
  };

  const handleGenerateReport = () => {
    setIsShowingReport(true);
  };

  const handleNewAnalysis = () => {
    setIsAnalyzing(false);
    setIsShowingReport(false);
    setAnalysisResults([]);
    setSelectedFiles([]);
    setSelectedImageIndex(0);
  };

  const runAnalysis = async () => {
    const results = await Promise.all(
      selectedFiles.map(async file => {
        const base64Image = await fileToBase64(file);
        return analyseImage(base64Image);
      })
    );
    setAnalysisResults(results);
  };
  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentAnnotation({
      points: [{ x, y }],
      color: '#FF0000', // Default red color
      width: 2
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentAnnotation({
      ...currentAnnotation,
      points: [...currentAnnotation.points, { x, y }]
    });
  };

  const stopDrawing = () => {
    if (currentAnnotation) {
      setAnnotations(prev => {
        const newAnnotations = [...prev];
        newAnnotations[currentImageIndex] = [...(newAnnotations[currentImageIndex] || []), currentAnnotation];
        return newAnnotations;
      });
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the current image
    const img = new Image();
    img.src = URL.createObjectURL(selectedFiles[currentImageIndex]);
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw saved annotations
      annotations[currentImageIndex]?.forEach(annotation => {
        if (annotation.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        annotation.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.width;
        ctx.stroke();
      });

      // Draw current annotation
      if (currentAnnotation?.points.length) {
        ctx.beginPath();
        ctx.moveTo(currentAnnotation.points[0].x, currentAnnotation.points[0].y);
        currentAnnotation.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = currentAnnotation.color;
        ctx.lineWidth = currentAnnotation.width;
        ctx.stroke();
      }
    };
  }, [currentImageIndex, annotations, currentAnnotation, selectedFiles]);

  // Handle description changes
  const handleDescriptionChange = (description: string) => {
    setImageDescriptions(prev => {
      const newDescriptions = [...prev];
      newDescriptions[currentImageIndex] = description;
      return newDescriptions;
    });
  };

  useEffect(() => {
    // Load Google Maps JavaScript API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['ca'] }, // Optional: restrict to specific countries
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) {
        setSiteAddress(place.formatted_address);
      }
    });
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
              onClick={handleNewAnalysis}
              className="rounded-full border border-transparent bg-foreground text-background px-6 py-2 text-sm hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              New Analysis
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8 pb-8">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-black/[.08] dark:border-white/[.145] pb-6">
              <div>
                <h1 className="text-2xl font-bold mb-4">Structural Analysis Report</h1>
                <p className="text-sm text-gray-500">Report Generated: {new Date().toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Site Address: {siteAddress}</p>
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

  if (isAnalyzing) {
    if (analysisResults.length === 0) {
      return (
        <div className="grid place-items-center h-screen font-[family-name:var(--font-geist-sans)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-black/[.08] border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Analyzing your images...</p>
          </div>
        </div>
      );
    }

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
              <div className="bg-black/[.03] dark:bg-white/[.03] p-4 rounded-lg flex-1">
                {analysisResults[selectedImageIndex] && (
                  <div className="space-y-4 text-sm">
                    <p><strong>Component Type:</strong> {analysisResults[selectedImageIndex].component_type}</p>
                    <p><strong>Condition Grade:</strong> {analysisResults[selectedImageIndex].condition_grade}/5</p>
                    <p><strong>Condition:</strong> {analysisResults[selectedImageIndex].condition_description}</p>
                    <p><strong>Recommendations:</strong> {analysisResults[selectedImageIndex].maintenance_recommendations}</p>
                  </div>
                )}
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

  if (isAnnotating) {
    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{selectedFiles[currentImageIndex].name}</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
              disabled={currentImageIndex === 0}
              className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-2 text-sm hover:border-black/[.15] dark:hover:border-white/[.25] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentImageIndex(prev => Math.min(selectedFiles.length - 1, prev + 1))}
              disabled={currentImageIndex === selectedFiles.length - 1}
              className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-2 text-sm hover:border-black/[.15] dark:hover:border-white/[.25] disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={async () => {
                setIsAnnotating(false);
                setIsAnalyzing(true);
                await runAnalysis();
                //setIsAnalyzing(false);
              }}
              className="rounded-full border border-transparent bg-foreground text-background px-6 py-2 text-sm hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Begin Analysis
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex justify-center items-center gap-6 h-full max-w-7xl mx-auto">
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-3xl">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border border-black/[.08] dark:border-white/[.145] rounded-lg w-full h-auto"
              />
            </div>
          </div>
          
          <div className="w-64 flex-none self-center space-y-4">
            {/* Description Input */}
            <div className="p-4 bg-black/[.03] dark:bg-white/[.03] rounded-lg">
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <textarea
                value={imageDescriptions[currentImageIndex] || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Add notes about this image..."
                className="w-full min-h-[200px] p-2 text-sm rounded-lg border border-black/[.08] dark:border-white/[.145] bg-transparent
                  placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
              />
            </div>
            
            <div className="p-4 bg-black/[.03] dark:bg-white/[.03] rounded-lg">
              <h3 className="text-sm font-medium mb-2">Image {currentImageIndex + 1} of {selectedFiles.length}</h3>
              <p className="text-sm text-gray-500">{selectedFiles[currentImageIndex].name}</p>
              
              <input
                id="add-more-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const newFiles = Array.from(e.target.files);
                    setSelectedFiles(prev => [...prev, ...newFiles]);
                    setAnnotations(prev => [...prev, ...new Array(newFiles.length).fill([])]);
                    setImageDescriptions(prev => [...prev, ...new Array(newFiles.length).fill('')]);
                  }
                }}
                className="hidden"
              />
              <label 
                htmlFor="add-more-images"
                className="mt-4 flex items-center justify-center rounded-lg border border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm hover:border-black/[.15] dark:hover:border-white/[.25] cursor-pointer"
              >
                Add More Images
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-6 row-start-2 items-center w-full max-w-2xl">
        <img 
          src="/LUNCHTIME.png" 
          alt="LUNCHTIME" 
          className="h-24 sm:h-32 object-contain -mt-20"
        />
        
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full">
            <label htmlFor="site-address" className="block text-sm font-medium mb-2">
              Building Site Address
            </label>
            <input
              ref={inputRef}
              id="site-address"
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Enter the building site address"
              className="w-full p-3 rounded-lg border border-black/[.08] dark:border-white/[.145] bg-transparent
                placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-foreground"
              required
            />
          </div>

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
            onClick={() => {
              setIsAnnotating(true);
              setIsAnalyzing(false);
              setAnalysisResults([]);
              setSelectedFiles([]);
            }}
            disabled={selectedFiles.length === 0}
            className={`rounded-full border border-solid transition-colors flex items-center justify-center gap-2 text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10 w-full max-w-[200px]
              ${selectedFiles.length > 0
                ? 'border-transparent bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]' 
                : 'border-black/[.08] dark:border-white/[.145] bg-[#f2f2f2] dark:bg-[#1a1a1a] text-gray-400 cursor-not-allowed'
              }`}
          >
            Begin Annotation
          </button>
        </div>
      </main>

      <footer className="row-start-3 text-sm text-center text-gray-500">
        Upload images to generate an analysis report
      </footer>
    </div>
  );
}
