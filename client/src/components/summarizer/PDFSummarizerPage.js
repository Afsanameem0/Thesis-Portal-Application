import React from 'react';
import { Link } from 'react-router-dom';
import PDFSummarizer from './PDFSummarizer';

const PDFSummarizerPage = () => {
  const handleSummaryGenerated = (summaryData) => {
    console.log('Summary generated:', summaryData);

  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-[1px] shadow-xl">
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-black flex items-center">
                  
                    Paper Analyzer
                  </h1>
                  <p className="mt-1 text-sm text-black">Upload a PDF and generate a beautifully formatted academic summary and suggestions for improvement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
       {/* PDF Summarizer Component */}
        <PDFSummarizer
          onSummaryGenerated={handleSummaryGenerated}
        />
      </div>
    </div>  
  );
};

export default PDFSummarizerPage;
