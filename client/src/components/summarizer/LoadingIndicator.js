import React from 'react';

const LoadingIndicator = ({ message = "Processing PDF with enhanced AI algorithms..." }) => {
  return (
    <div className="mt-4 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="relative">
          {/* Animated circles */}
          <div className="flex space-x-2 justify-center items-center">
            <div className="h-4 w-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-4 w-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-4 w-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce"></div>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            AI Processing in Progress
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {message}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            This may take 1-3 minutes for comprehensive analysis.
          </p>
        </div>
        
        {/* Progress steps */}
        <div className="mt-6 max-w-sm mx-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Extracting</span>
            <span>Processing</span>
            <span>Summarizing</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
