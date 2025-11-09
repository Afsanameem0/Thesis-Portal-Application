import React, { useState } from 'react';
import axios from 'axios'; // Added axios import

const ThesisDetailModal = ({ isOpen, onClose, data, type, onApprove, onReject }) => {
  const [downloading, setDownloading] = useState(false);
  
  if (!isOpen || !data) return null;

  // Determine if item is still pending (can be approved/rejected)
  const isPending = type === 'registration' 
    ? data.thesisRegistration?.status === 'pending'
    : data.status === 'pending';

  const handleDownloadPDF = async () => {
    if (!data.fileName || !data._id) {
      alert('PDF file not available for download');
      return;
    }

    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5001/api/theses/${data._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], {
          type: response.headers['content-type'] || 'application/octet-stream'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.fileName || 'thesis.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error(`Download failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleApprove = () => {
    onApprove();
    onClose();
  };

  const handleReject = () => {
    if (type === 'registration') {
      const comments = prompt('Enter rejection reason (optional):');
      onReject(comments || '');
    } else {
      onReject();
    }
    onClose();
  };

  const renderRegistrationContent = () => (
    <div className="space-y-6">
      {/* Student Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Name:</span>
            <p className="text-gray-900">{data.name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span>
            <p className="text-gray-900">{data.email}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Department:</span>
            <p className="text-gray-900">{data.department}</p>
          </div>
          {data.studentId && (
            <div>
              <span className="font-medium text-gray-700">Student ID:</span>
              <p className="text-gray-900">{data.studentId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Thesis Registration Details</h3>
        
        <div>
          <span className="font-medium text-gray-700">Title:</span>
          <p className="text-gray-900 mt-1 text-lg">{data.thesisRegistration.title}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Description:</span>
          <div className="mt-1 p-3 bg-gray-50 rounded border">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {data.thesisRegistration.description}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Submitted:</span>
            <p className="text-gray-900">
              {new Date(data.thesisRegistration.submittedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
              data.thesisRegistration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              data.thesisRegistration.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {data.thesisRegistration.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderThesisContent = () => (
    <div className="space-y-6">
      {/* Thesis Basic Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Thesis Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-gray-900 font-semibold">{data.submissionType}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
              data.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              data.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {data.status}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Department:</span>
            <p className="text-gray-900">{data.department}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted:</span>
            <p className="text-gray-900">
              {new Date(data.submissionDate).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Thesis Content */}
      <div className="space-y-4">
        <div>
          <span className="font-medium text-gray-700">Title:</span>
          <p className="text-gray-900 mt-1 text-lg font-medium">{data.title}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Abstract:</span>
          <div className="mt-1 p-3 bg-gray-50 rounded border max-h-40 overflow-y-auto">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {data.abstract}
            </p>
          </div>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Keywords:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {data.keywords?.map((keyword, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Year:</span>
            <p className="text-gray-900">{data.year}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Semester:</span>
            <p className="text-gray-900">{data.semester}</p>
          </div>
        </div>

        {/* File Information */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Document Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="font-medium text-gray-700">File Name:</span>
              <p className="text-gray-900">{data.fileName}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">File Size:</span>
              <p className="text-gray-900">
                {data.fileSize ? `${(data.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex justify-start">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || !data.fileName}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>


        {/* Author Information */}
        {data.author && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Author Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <p className="text-gray-900">{data.author.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <p className="text-gray-900">{data.author.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === 'registration' ? 'Thesis Registration Details' : 'Thesis Submission Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === 'registration' ? renderRegistrationContent() : renderThesisContent()}
        </div>

        {/* Action Buttons - Only show if item is pending */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {isPending && (
            <>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThesisDetailModal; 