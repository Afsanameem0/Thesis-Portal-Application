import React, { useState } from 'react';
import axios from 'axios';
import SummaryDisplay from './SummaryDisplay';
import LoadingIndicator from './LoadingIndicator';
import SuggestionsDisplay from './SuggestionsDisplay';

const PDFSummarizer = ({ thesisId, existingFilePath, onSummaryGenerated }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('upload'); // 'upload' or 'existing'
  const [summaryOptions, setSummaryOptions] = useState({
    maxLength: 800,     // Increased for comprehensive academic summaries
    minLength: 400,     // Increased for detailed academic content
    saveText: false,
    useAcademicModel: false,
    detailed: true,
    academicFormat: true  // New option for structured academic format
  });
  
  // New state for suggestions
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleSummarizeUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setStats(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('max_length', summaryOptions.maxLength);
      formData.append('min_length', summaryOptions.minLength);
      formData.append('save_text', summaryOptions.saveText);
      formData.append('use_academic_model', summaryOptions.useAcademicModel);
      formData.append('detailed', summaryOptions.detailed);
      formData.append('academic_format', summaryOptions.academicFormat);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/pdf-summary/upload-and-summarize',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSummary(response.data.data.summary);
        setStats(response.data.data.stats);
        
        if (onSummaryGenerated) {
          onSummaryGenerated({
            summary: response.data.data.summary,
            stats: response.data.data.stats,
            filename: response.data.data.originalFilename
          });
        }
      }
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      setError(error.response?.data?.message || 'Failed to summarize PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeExisting = async () => {
    if (!existingFilePath) {
      setError('No existing file path provided');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setStats(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/pdf-summary/summarize-file',
        {
          filePath: existingFilePath,
          max_length: summaryOptions.maxLength,
          min_length: summaryOptions.minLength,
          use_academic_model: summaryOptions.useAcademicModel,
          detailed: summaryOptions.detailed,
          academic_format: summaryOptions.academicFormat
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSummary(response.data.data.summary);
        setStats(response.data.data.stats);
        
        if (onSummaryGenerated) {
          onSummaryGenerated({
            summary: response.data.data.summary,
            stats: response.data.data.stats,
            filename: existingFilePath
          });
        }
      }
    } catch (error) {
      console.error('Error summarizing existing file:', error);
      setError(error.response?.data?.message || 'Failed to summarize file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!file && !existingFilePath) {
      setSuggestionsError('Please upload a PDF file first');
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsError('');
    setSuggestions(null);

    try {
      const token = localStorage.getItem('token');

      if (file) {
        // If file is uploaded, create FormData and send the file directly
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await axios.post(
          'http://localhost:5001/api/pdf-summary/generate-suggestions-upload',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        if (response.data.success) {
          setSuggestions(response.data.data);
        }
      } else if (existingFilePath) {
        // If using existing file, send the file path
        const requestData = { filePath: existingFilePath };
        
        const response = await axios.post(
          'http://localhost:5001/api/pdf-summary/generate-suggestions',
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          setSuggestions(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestionsError(error.response?.data?.message || 'Failed to generate suggestions. Please try again.');
    } finally {
      setSuggestionsLoading(false);
    }
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      alert('Copied to clipboard!');
    });
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black mb-4 flex items-center">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0 0V4m0 8v8m8-8a8 8 0 11-16 0 8 8 0 0116 0z" />
          </svg>
          AI-Powered Paper Analyzer
        </h3>

        {/* Mode Selection */}
        <div className="mb-4">
          <div className="inline-flex rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-200 bg-gray-100">
     
            {existingFilePath && (
              <button
                onClick={() => setMode('existing')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'existing' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-black' : 'text-black hover:bg-white'}`}
              >
                Existing File
              </button>
            )}
          </div>
        </div>

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select PDF File
              </label>
              <div className="relative">
                <input
                  id="pdfUpload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="sr-only"
                  disabled={loading}
                />
                <label
                  htmlFor="pdfUpload"
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 border-dashed ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'} hover:bg-white transition-colors cursor-pointer`}
                >
                  <span className="flex items-center text-sm text-black">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H17a4 4 0 010 8h-1" />
                    </svg>
                    {file ? 'Change selected PDF' : 'Click to choose a PDF or drag it here'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-black">
                    Browse
                  </span>
                </label>
              </div>
              {file && (
                <div className="mt-2 flex items-center text-sm text-black">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleSummarizeUpload}
                disabled={!file || loading}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-black text-base font-semibold shadow-md hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:text-black disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Summary..
                  </>
                )}
              </button>
              
              <button
                onClick={handleGenerateSuggestions}
                disabled={!file || suggestionsLoading}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-black text-base font-semibold shadow-md hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:text-black disabled:cursor-not-allowed flex items-center"
                title={!file ? "Upload a PDF file first to generate suggestions" : "Generate AI-powered suggestions to improve your paper"}
              >
                {suggestionsLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547z" />
                    </svg>
                    Generate Suggestions..
                  </>
                )}
              </button>
            </div>
            
 
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-black rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
              )}
            </div>
        )}

        {/* Existing File Mode */}
        {mode === 'existing' && existingFilePath && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-black-600 mb-2">
                File: <span className="font-medium">{existingFilePath}</span>
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleSummarizeExisting}
                disabled={loading}
                className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-black rounded-2xl shadow-lg font-semibold text-base hover:shadow-xl transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:text-black disabled:cursor-not-allowed"
                style={{
                  transition: 'all 0.2s ease',
                  transform: loading ? 'none' : 'scale(1)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => !loading && (e.target.style.transform = 'scale(1)')}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate Summary..</span>
                  </div>
                )}
              </button>
              
              <button
                onClick={handleGenerateSuggestions}
                disabled={suggestionsLoading}
                className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-black rounded-2xl shadow-lg font-semibold text-base hover:shadow-xl transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:text-black disabled:cursor-not-allowed"
                style={{
                  transition: 'all 0.2s ease',
                  transform: suggestionsLoading ? 'none' : 'scale(1)',
                  cursor: suggestionsLoading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !suggestionsLoading && (e.target.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => !suggestionsLoading && (e.target.style.transform = 'scale(1)')}
                title="Generate AI-powered suggestions to improve your paper"
              >
                {suggestionsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547z" />
                    </svg>
                    <span>Generate Suggestions..</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && <LoadingIndicator />}

        {/* Summary Display */}
        <SummaryDisplay
          summary={summary}
          stats={stats}
          onCopy={copyToClipboard}
        />

        {/* Suggestions Error Display */}
        {suggestionsError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-black rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {suggestionsError}
          </div>
        )}

        {/* Suggestions Display */}
        <SuggestionsDisplay
          suggestions={suggestions?.suggestions}
          analysis={suggestions?.analysis}
          model={suggestions?.model}
          timestamp={suggestions?.timestamp}
          error={suggestions?.error}
          onCopy={copyToClipboard}
        />
      </div>
    </div>
  );
};

export default PDFSummarizer;
