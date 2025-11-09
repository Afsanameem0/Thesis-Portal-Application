import React from 'react';

const SummaryDisplay = ({ summary, stats, onCopy }) => {
  const formatSummaryText = (text) => {
    if (!text) return '';
    
    return text
      // Convert markdown headers to HTML
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-6 flex items-center">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium text-gray-700 mb-2 mt-4">$1</h3>')
      
      // Convert markdown bold to HTML
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      
      // Convert bullet points
      .replace(/• /g, '<span class="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 align-middle"></span>')
      
      // Convert horizontal rules
      .replace(/^---$/gm, '<hr class="my-6 border-gray-300">')
      
      // Convert line breaks to proper spacing
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>')
      
      // Wrap in paragraph tags
      .replace(/^(?!<[h1-6]|<hr|<strong)(.+)/gm, '<p class="mb-4">$1</p>')
      
      // Clean up empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, '')
      .replace(/<p class="mb-4"><br><\/p>/g, '');
  };

  const copyToClipboard = () => {
    if (summary && onCopy) {
      onCopy(summary);
    }
  };

  if (!summary) return null;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-black flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI-Generated Academic Summary
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-black bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow hover:shadow-md active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Summary
          </button>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg overflow-hidden">
        <div className="p-6">
          <div 
            className="prose prose-blue max-w-none"
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
              lineHeight: '1.7',
              color: '#000000'
            }}
            dangerouslySetInnerHTML={{
              __html: formatSummaryText(summary)
            }}
          />
        </div>
      </div>
      
      {stats && (
        <div className="mt-4 bg-gray-50 rounded-xl p-4 ring-1 ring-gray-100">
          <h5 className="text-sm font-medium text-black mb-2">Analysis Statistics</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              <span className="text-black">Original: <strong className="text-black">{stats.textLength?.toLocaleString()}</strong> characters</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span className="text-black">Summary: <strong className="text-black">{stats.summaryLength?.toLocaleString()}</strong> characters</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              <span className="text-black">Compression: <strong className="text-black">{stats.compressionRatio}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryDisplay;
