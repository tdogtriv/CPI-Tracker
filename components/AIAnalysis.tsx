import React, { useState } from 'react';
import { Bot, RefreshCw, AlertCircle } from 'lucide-react';
import { CPIData, AnalysisStatus } from '../types';
import { analyzeCPITrends } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  data: CPIData;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ data }) => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [report, setReport] = useState<string>("");

  const handleGenerate = async () => {
    setStatus(AnalysisStatus.LOADING);
    try {
      const result = await analyzeCPITrends(data);
      setReport(result);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error) {
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-600">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Market Analyst</h3>
            <p className="text-xs text-slate-500">Powered by Gemini 2.5</p>
          </div>
        </div>
        
        {status === AnalysisStatus.IDLE && (
          <button 
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Generate Report
          </button>
        )}
      </div>

      {status === AnalysisStatus.LOADING && (
        <div className="flex flex-col items-center justify-center py-8 text-indigo-400 animate-pulse">
          <RefreshCw className="animate-spin mb-2" size={32} />
          <p className="text-sm">Analyzing market trends...</p>
        </div>
      )}

      {status === AnalysisStatus.ERROR && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle size={20} />
          <span className="text-sm">Unable to generate report. Please check your API key configuration.</span>
          <button onClick={handleGenerate} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {status === AnalysisStatus.SUCCESS && (
        <div className="prose prose-sm prose-indigo max-w-none bg-white p-6 rounded-xl shadow-sm border border-indigo-50/50">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
      
      {status === AnalysisStatus.IDLE && (
         <p className="text-sm text-slate-600 mt-2">
            Click generate to get a professional summary of the current inflation factors driving the Bolivian market based on the GitHub data.
         </p>
      )}
    </div>
  );
};