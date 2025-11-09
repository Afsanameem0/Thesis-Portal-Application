
import React, { useState, useEffect } from "react";
import ST3 from "../assets/img/ST3.jpg";
import ST from "../assets/img/ST.png";
import ST2 from "../assets/img/ST2.jpg";

const items = [
  {
    src: ST3,
    alt: "Academic Research",
    title: "Academic Research",
    description: "Discover groundbreaking research and scholarly work"
  },
  {
    src: ST,
    alt: "Thesis Management", 
    title: "Thesis Management",
    description: "Efficiently manage and organize your academic thesis"
  },
  {
    src: ST2,
    alt: "Knowledge Sharing",
    title: "Knowledge Sharing", 
    description: "Connect with researchers and share academic insights"
  },
];

function SectionCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = () => {
    setActiveIndex((prevIndex) => 
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setActiveIndex((prevIndex) => 
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index) => {
    setActiveIndex(index);
  };

  // Auto-advance carousel every 4 seconds when not hovered
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(nextSlide, 4000);
      return () => clearInterval(interval);
    }
  }, [isHovered]);

  return (
    <div className="py-8 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* PowerPoint-style Presentation Container */}
        <div 
          className="relative bg-gray-100 rounded-lg shadow-lg overflow-hidden border"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ aspectRatio: '16/9', maxHeight: '400px' }}
        >
          {/* Slide Counter */}
          <div className="absolute top-4 right-4 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {activeIndex + 1} / {items.length}
          </div>

          {/* Main Slide Area */}
          <div className="relative w-full h-full overflow-hidden bg-white">
            {/* Only show the current active slide */}
            <div className="w-full h-full">
              <img 
                src={items[activeIndex].src} 
                alt={items[activeIndex].alt}
                className="w-full h-full object-cover transition-opacity duration-500"
              />
            </div>
            
            {/* Clean Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">
                {items[activeIndex].title}
              </h3>
              <p className="text-gray-200 text-lg">
                {items[activeIndex].description}
              </p>
            </div>
          </div>

          {/* Navigation Arrows - PowerPoint Style */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-md transition-all duration-200"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Progress Bar - PowerPoint Style */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ 
                width: `${((activeIndex + 1) / items.length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* Slide Indicators - PowerPoint Style */}
        <div className="flex justify-center mt-6 space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-blue-500 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Slide Information Panel */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Academic Thesis Portal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    index === activeIndex 
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
                      : 'bg-white hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => goToSlide(index)}
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                      index === activeIndex ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SectionCarousel;
