import React from 'react';

const SuggestionsDisplay = ({ suggestions, analysis, model, timestamp, error, onCopy }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const copyToClipboard = (text) => {
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      });
    }
  };

  const copyAllSuggestions = () => {
    const allText = suggestions.join('\n\n');
    copyToClipboard(allText);
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-gray-100 p-6 mt-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-black mb-2 flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Paper Improvement Suggestions
        </h4>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
     

        </div>
        
        {error && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
            ✨ {error}
          </div>
        )}
      </div>



      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => {
          // Check if this is a section header
          const isHeader = suggestion.includes('**') && suggestion.includes(':**');
          const isStrengths = suggestion.includes('🎉 **Strengths Found:**');
          const isIssues = suggestion.includes('⚠️ **Issues to Address:**');
          const isContentAnalysis = suggestion.includes('🔬 **Content Analysis');
          const isStructure = suggestion.includes('📚 **Document Structure:**');
          const isWriting = suggestion.includes('🎓 **Academic Writing Improvements:**');
          
          if (isHeader) {
            return (
              <div key={index} className="border-b border-gray-200 pb-2">
                <h6 className={`font-semibold text-lg ${
                  isStrengths ? 'text-green-700' :
                  isIssues ? 'text-red-700' :
                  isContentAnalysis ? 'text-blue-700' :
                  isStructure ? 'text-purple-700' :
                  isWriting ? 'text-indigo-700' :
                  'text-gray-700'
                }`}>
                  {suggestion}
                </h6>
              </div>
            );
          }
          
          // Empty line for spacing
          if (suggestion.trim() === '') {
            return <div key={index} className="h-2"></div>;
          }
          
          // Regular suggestion
          return (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:border-green-300 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                {suggestion.includes('') ? '->' : suggestion.includes('') ? '' : index + 1}
              </div>
              <div className="flex-1">
                <p className="text-black text-sm leading-relaxed">{suggestion}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Copy All Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={copyAllSuggestions}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-black rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy All Suggestions</span>
        </button>
      </div>
    </div>
  );
};

export default SuggestionsDisplay;

