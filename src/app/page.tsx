'use client';

import { useState, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { analyseImage, AnalysisResult, ImageData } from '@/lib/analysis';
import { Loader } from "@/components/ui/loader";
import { generateReport } from '@/lib/report';
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
  const [currentAnnotation, setCurrentAnnotation] = useState<{points: {x: number, y: number}[]} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<ImageData[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [introduction, setIntroduction] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

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

  const handleUpload = (files: File[]) => {
    setSelectedFiles(files);
    setImageData(files.map(file => ({
      file: file,
      originalFile: file,
      description: ''
    })));
    setCurrentImageIndex(0);
    setIsAnnotating(true);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const report = await generateReport(siteAddress, analysisResults);
    setIntroduction(report.introduction);
    setSummary(report.summary);
    setIsShowingReport(true);
    setIsGeneratingReport(false);
  };

  const handleNewAnalysis = () => {
    setIsAnalyzing(false);
    setIsShowingReport(false);
    setAnalysisResults([]);
    setSelectedFiles([]);
    setSelectedImageIndex(0);
  };

  const runAnalysis = async () => {
    try {
      const results = await Promise.all(
        imageData.map(async (data) => {
          console.log(data);
          return analyseImage(data);
        })
      );
      setAnalysisResults(results);
    } catch (error) {
      console.error('Analysis error:', error);
    }
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      // Create a new File with the annotations drawn on it
      const annotatedFile = new File([blob], imageData[currentImageIndex].file.name, {
        type: 'image/png'
      });

      // Update the imageData with the annotated version but keep the original
      setImageData(prev => {
        const newData = [...prev];
        newData[currentImageIndex] = {
          ...newData[currentImageIndex],
          file: annotatedFile // Only update the annotated version
        };
        return newData;
      });
    }, 'image/png');

    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  // Separate effect for loading the image
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(selectedFiles[currentImageIndex]);
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw saved annotations
      drawAnnotations();
    };
  }, [currentImageIndex, selectedFiles]); // Only re-run when image changes

  // Separate function for drawing annotations
  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

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
  };

  // Effect for drawing current annotation
  useEffect(() => {
    if (!isDrawing || !currentAnnotation) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear and redraw base image with saved annotations
    const img = new Image();
    img.src = URL.createObjectURL(selectedFiles[currentImageIndex]);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      drawAnnotations();

      // Draw current annotation
      if (currentAnnotation.points.length) {
        ctx.beginPath();
        ctx.moveTo(currentAnnotation.points[0].x, currentAnnotation.points[0].y);
        currentAnnotation.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = '#FF0000'; // Default red color
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
  }, [currentAnnotation?.points]); // Only re-run when points change

  // Handle description changes
  const handleDescriptionChange = (description: string) => {
    setImageData(prev => {
      const newData = [...prev];
      newData[currentImageIndex] = {
        ...newData[currentImageIndex],
        description
      };
      return newData;
    });
    
    setImageDescriptions(prev => {
      const newDescriptions = [...prev];
      newDescriptions[currentImageIndex] = description;
      return newDescriptions;
    });
  };

  // When clicking "Begin Analysis" button in annotation view
  const startAnalysis = async () => {
    setIsAnnotating(false);
    setIsAnalyzing(true);
    await runAnalysis(); // Make sure we run the analysis after state changes
  };

  // Update the useEffect for Google Maps
  useEffect(() => {
    // Check if the script is already loaded
    if (window.google) {
      initAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      initAutocomplete();
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script only if we added it
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['ca'] },
      fields: ['formatted_address', 'geometry']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address) {
        setSiteAddress(place.formatted_address);
      }
    });
  };

  if (isGeneratingReport) {
    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center justify-center h-full gap-4 col-start-1 row-start-2">
          <Loader className="text-foreground" />
          <h1 className="text-2xl font-bold">Generating Report</h1>
          <p className="text-sm text-gray-500">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  if (isShowingReport) {
    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        {/* Header - removed the h1 title */}
        <div className="flex justify-end items-center mb-12">
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
                <h1 className="text-2xl font-bold mb-4 focus:outline-none" contentEditable suppressContentEditableWarning>
                  Building Condition Assessment
                </h1>
                <p className="text-sm text-gray-500 focus:outline-none" contentEditable suppressContentEditableWarning>
                  Report Generated: {new Date().toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500 focus:outline-none" contentEditable suppressContentEditableWarning>
                  Site Address: {siteAddress}
                </p>
                <p className="text-sm text-gray-500 focus:outline-none" contentEditable suppressContentEditableWarning>
                  Total Components Analyzed: {analysisResults.length}
                </p>
              </div>
              {/* Logo */}
              <div className="w-20 h-20">
                <img 
                  src="/cion.svg" 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Introduction Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium focus:outline-none" contentEditable suppressContentEditableWarning>
                Introduction
              </h2>
              <div className="space-y-4">
                <p className="text-sm focus:outline-none" contentEditable suppressContentEditableWarning>
                  {introduction}
                </p>
              </div>
            </div>

            {/* Components Analysis Section */}
            <div className="space-y-12">
              <h2 className="text-xl font-medium focus:outline-none" contentEditable suppressContentEditableWarning>
                Component Analysis
              </h2>
              {analysisResults.map((result, index) => (
                <div key={index} className="space-y-8">
                  <h3 className="text-lg font-medium capitalize focus:outline-none" contentEditable suppressContentEditableWarning>
                    {result.component_type} (
                    <a 
                      href={`#figure-${index + 1}`} 
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`figure-${index + 1}`)?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        });
                      }}
                    >
                      See Figure A.{index + 1}
                    </a>
                    )
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 focus:outline-none" contentEditable suppressContentEditableWarning>
                        Condition Assessment
                      </h4>
                      <p className="text-sm mt-1 focus:outline-none" contentEditable suppressContentEditableWarning>
                        {result.condition_description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 focus:outline-none" contentEditable suppressContentEditableWarning>
                        Recommended Actions
                      </h4>
                      <p className="text-sm mt-1 focus:outline-none" contentEditable suppressContentEditableWarning>
                        {result.maintenance_recommendations}
                      </p>
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
              <h2 className="text-lg font-medium mb-4 focus:outline-none" contentEditable suppressContentEditableWarning>
                Summary
              </h2>
              <p className="text-sm focus:outline-none" contentEditable suppressContentEditableWarning>
                {summary}
              </p>
            </div>

            {/* Appendix Section - Add IDs to each figure */}
            <div className="border-t border-black/[.08] dark:border-white/[.145] pt-12">
              <h2 className="text-xl font-medium mb-8 focus:outline-none" contentEditable suppressContentEditableWarning>
                Appendix: Component Images
              </h2>
              <div className="space-y-12">
                {analysisResults.map((result, index) => (
                  <div 
                    key={index} 
                    id={`figure-${index + 1}`}  // Add ID for linking
                    className="space-y-4 scroll-mt-8"  // Add scroll margin for better positioning
                  >
                    <h3 className="text-lg font-medium focus:outline-none" contentEditable suppressContentEditableWarning>
                      Figure A.{index + 1}: {result.component_type}
                    </h3>
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-2xl aspect-square">
                        <img
                          src={URL.createObjectURL(imageData[index].originalFile)}
                          alt={`Figure A.${index + 1}: ${result.component_type}`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-4 max-w-2xl text-center focus:outline-none" contentEditable suppressContentEditableWarning>
                        Figure A.{index + 1}: {result.component_type} - {imageData[index].description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    if (analysisResults.length === 0) {
      return (
        <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
          <div className="flex flex-col items-center justify-center h-full gap-4 col-start-1 row-start-2">
            <Loader className="text-foreground" />
            <h1 className="text-2xl font-bold">Analyzing Images</h1>
            <p className="text-sm text-gray-500">This may take a few moments...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-rows-[auto_1fr_auto] h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        {/* Header - increased margin-bottom from mb-6 to mb-12 */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">Analysis Results</h1>
          <div className="flex gap-4">
            <button
              onClick={handleNewAnalysis}
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

        {/* Main Content */}
        <div className="w-full h-full flex gap-6 max-h-[calc(100vh-180px)]">
          {/* Scrollable thumbnail gallery */}
          <div className="w-32 flex-none overflow-y-auto">
            <div className="flex flex-col gap-3">
              {imageData.map((data, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 
                    ${index === selectedImageIndex 
                      ? 'border-foreground' 
                      : 'border-transparent'
                    }`}
                >
                  <img
                    src={URL.createObjectURL(data.file)}
                    alt={`Upload ${index + 1}`}
                    className="object-cover w-full h-full"
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
                src={URL.createObjectURL(imageData[selectedImageIndex].file)}
                alt={imageData[selectedImageIndex].file.name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Analysis details */}
            <div className="w-96 flex-none flex flex-col overflow-y-auto">
              <h2 className="text-lg font-medium truncate mb-4">
                {imageData[selectedImageIndex].file.name}
              </h2>
              <div className="bg-black/[.03] dark:bg-white/[.03] p-4 rounded-lg flex-1">
                {analysisResults[selectedImageIndex] && (
                  <div className="space-y-4 text-sm">
                    <p><strong>Component Type:</strong> {analysisResults[selectedImageIndex].component_type}</p>
                    <p><strong>Condition Grade:</strong> {analysisResults[selectedImageIndex].condition_grade}</p>
                    <p><strong>Condition:</strong> {analysisResults[selectedImageIndex].condition_description}</p>
                    <p><strong>Recommendations:</strong> {analysisResults[selectedImageIndex].maintenance_recommendations}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
              onClick={startAnalysis}
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
                value={imageData[currentImageIndex]?.description || ''}
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
                    setImageData(prev => [...prev, ...newFiles.map(file => ({
                      file,
                      originalFile: file,
                      description: ''
                    }))]);
                    // Set current image index to the first new image
                    setCurrentImageIndex(selectedFiles.length);
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
        </div>
      </main>

      <footer className="row-start-3 text-sm text-center text-gray-500">
        Upload images to generate an analysis report
      </footer>
    </div>
  );
}