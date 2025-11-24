import React from 'react';
import { TrendingUp, FileText, Download, BookOpen } from 'lucide-react';

interface HeaderProps {
  onDownload?: () => void;
  onDownloadMethodology?: () => void;
  hasData?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onDownload, onDownloadMethodology, hasData }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bolivia CPI Tracker</h1>
              <p className="text-xs text-slate-500 font-medium">Powered by Hipermaxi Data</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {hasData && (
               <div className="hidden sm:flex items-center gap-2">
                 {onDownloadMethodology && (
                   <button 
                     onClick={onDownloadMethodology}
                     className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                     title="Download Methodology & Mappings"
                   >
                     <BookOpen size={16} />
                     <span>Methodology</span>
                   </button>
                 )}
                 {onDownload && (
                   <button 
                     onClick={onDownload}
                     className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                     title="Download Dataset"
                   >
                     <Download size={16} />
                     <span>CSV</span>
                   </button>
                 )}
               </div>
             )}
             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
             <a 
               href="https://github.com/mauforonda/precios" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-sm text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
             >
               <FileText size={16} />
               <span>Source Data</span>
             </a>
          </div>
        </div>
      </div>
    </header>
  );
};