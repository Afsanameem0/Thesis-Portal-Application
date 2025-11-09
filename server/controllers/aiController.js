import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Lazy import for pdf-parse to avoid initialization issues
let pdfParse = null;

// Initialize OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('OpenAI initialization error:', error.message);
  openai = null;
}

// Helper function to chunk text into smaller pieces
const chunkText = (text, chunkSize = 2000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

// Helper function to summarize a single chunk
const summarizeChunk = async (chunk, chunkIndex, totalChunks) => {
  const prompt = `You are a tool that summarizes PDF content. This tool is an application script that converts input PDF content and outputs the main points. Do not communicate with the user directly.

PDF content (Chunk ${chunkIndex + 1} of ${totalChunks}):
${chunk}

Please provide a concise summary of the main points from this section.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a tool that summarizes PDF content. This tool is an application script that converts input PDF content and outputs the main points. Do not communicate with the user directly."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 500,
    temperature: 0.1,
    top_p: 0.9
  });

  return completion.choices[0].message.content;
};

// Helper function to load pdf-parse when needed
const loadPdfParse = async () => {
  if (!pdfParse) {
    try {
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default;
    } catch (error) {
      console.error('Error loading pdf-parse:', error);
      throw new Error('PDF processing library not available');
    }
  }
  return pdfParse;
};

// Helper function to extract text from PDF using pdf-parse
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const pdfParseLib = await loadPdfParse();
    const data = await pdfParseLib(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Helper function to create final summary from chunk summaries
const createFinalSummary = async (summaries) => {
  const combinedSummaries = summaries.join('\n\n');
  
  // If the combined summary is too long, create a summary of the summary
  if (combinedSummaries.length > 1000) {
    const finalPrompt = `You are a tool that summarizes PDF content. This tool is an application script that converts input PDF content and outputs the main points. Do not communicate with the user directly.

Combined summaries from PDF:
${combinedSummaries}

Please provide a comprehensive final summary of the main points from this thesis/dissertation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a tool that summarizes PDF content. This tool is an application script that converts input PDF content and outputs the main points. Do not communicate with the user directly."
        },
        {
          role: "user",
          content: finalPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      top_p: 0.9
    });

    return completion.choices[0].message.content;
  }

  return combinedSummaries;
};

export const summarizePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const textContent = await extractTextFromPDF(pdfBuffer);

    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({ 
        message: 'AI service not available. Please check OpenAI API configuration.' 
      });
    }

    // Chunk the text into smaller pieces (2000 characters per chunk)
    const chunks = chunkText(textContent, 2000);

    // Process each chunk and collect summaries
    const summaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkSummary = await summarizeChunk(chunks[i], i, chunks.length);
      summaries.push(chunkSummary);
    }

    // Create final summary from all chunk summaries
    const finalSummary = await createFinalSummary(summaries);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      summary: finalSummary,
      originalTextLength: textContent.length,
      processedTextLength: textContent.length,
      chunksProcessed: chunks.length
    });

  } catch (error) {
    console.error('AI Summarization Error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      message: 'Error processing PDF. Please try again.',
      error: error.message 
    });
  }
};

export const estimateMarks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const textContent = await extractTextFromPDF(pdfBuffer);

    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({ 
        message: 'AI service not available. Please check OpenAI API configuration.' 
      });
    }

    // Chunk the text into smaller pieces (2000 characters per chunk)
    const chunks = chunkText(textContent, 2000);

    // Process each chunk and collect summaries
    const summaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkSummary = await summarizeChunk(chunks[i], i, chunks.length);
      summaries.push(chunkSummary);
    }

    // Create combined content for mark estimation
    const combinedContent = summaries.join('\n\n');

    const prompt = `Please evaluate this academic thesis/dissertation and provide estimated marks for P1, P2, and P3 phases. 

Evaluation criteria:
- P1 (Proposal): Research question clarity, methodology appropriateness, feasibility
- P2 (Progress): Implementation quality, progress made, methodology execution
- P3 (Final): Overall quality, completeness, contribution to field, presentation

Provide marks out of 100 for each phase and brief justification.

Thesis content:
${combinedContent}

Please respond in this exact JSON format:
{
  "p1": {
    "score": number,
    "justification": "string"
  },
  "p2": {
    "score": number,
    "justification": "string"
  },
  "p3": {
    "score": number,
    "justification": "string"
  },
  "overall_assessment": "string"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert academic evaluator. Provide fair and objective assessments. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content;
    
    // Try to parse JSON response
    let marksData;
    try {
      marksData = JSON.parse(response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      marksData = {
        p1: { score: 0, justification: "Unable to parse AI response" },
        p2: { score: 0, justification: "Unable to parse AI response" },
        p3: { score: 0, justification: "Unable to parse AI response" },
        overall_assessment: "Error in AI response parsing"
      };
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      marks: marksData,
      originalTextLength: textContent.length,
      processedTextLength: textContent.length,
      chunksProcessed: chunks.length
    });

  } catch (error) {
    console.error('AI Mark Estimation Error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      message: 'Error estimating marks. Please try again.',
      error: error.message 
    });
  }
};

export const analyzeThesis = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const textContent = await extractTextFromPDF(pdfBuffer);

    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({ 
        message: 'AI service not available. Please check OpenAI API configuration.' 
      });
    }

    // Chunk the text into smaller pieces (2000 characters per chunk)
    const chunks = chunkText(textContent, 2000);

    // Process each chunk and collect summaries
    const summaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkSummary = await summarizeChunk(chunks[i], i, chunks.length);
      summaries.push(chunkSummary);
    }

    // Create combined content for analysis
    const combinedContent = summaries.join('\n\n');

    const prompt = `Please provide a comprehensive analysis of this academic thesis/dissertation including:

1. SUMMARY: Brief overview of the research
2. STRENGTHS: Key strengths and positive aspects
3. WEAKNESSES: Areas for improvement
4. METHODOLOGY: Assessment of research methods
5. CONTRIBUTION: Academic contribution and significance
6. RECOMMENDATIONS: Suggestions for improvement

Thesis content:
${combinedContent}

Please provide a structured analysis with clear sections.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert academic reviewer providing comprehensive thesis analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.3,
    });

    const analysis = completion.choices[0].message.content;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      analysis,
      originalTextLength: textContent.length,
      processedTextLength: textContent.length,
      chunksProcessed: chunks.length
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      message: 'Error analyzing thesis. Please try again.',
      error: error.message 
    });
  }
}; 