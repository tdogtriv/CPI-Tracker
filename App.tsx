import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { Charts } from './components/Charts';
import { CPIData, CITIES, CityConfig, CPIPoint, CATEGORY_MAPPING, CATEGORY_WEIGHTS } from './types';
import { fetchDirectoryListing, fetchRawCSV, selectFilesToProcess, fetchFileContent } from './services/githubService';
import { parseCSV, calculateSingleCityCPI, aggregateNationalCPI, parseProductMap } from './utils/csvParser';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<CPIData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        setProgress("Loading product catalog...");
        // 1. Fetch Product Map with multiple potential paths
        let mapContent = await fetchFileContent('data/hipermaxi/productos.csv');
        if (!mapContent) mapContent = await fetchFileContent('data/productos.csv');
        if (!mapContent) mapContent = await fetchFileContent('productos.csv');
        
        const productMap = mapContent ? parseProductMap(mapContent) : null;
        if (!productMap) {
            console.warn("Could not load productos.csv. Categories will be inferred from raw files if possible.");
        } else {
            console.log("Loaded product map: " + Object.keys(productMap).length + " items.");
        }

        // 2. Process each city
        const cityResults: { cityId: string, points: CPIPoint[] }[] = [];
        const errors: string[] = [];

        for (const city of CITIES) {
            setProgress(`Scanning ${city.name} data...`);
            
            // Fetch file list for this city
            const allFiles = await fetchDirectoryListing(city.path);
            
            if (allFiles.length === 0) {
                const msg = `No CSV files found for ${city.name} at path '${city.path}'.`;
                console.warn(msg);
                errors.push(msg);
                continue;
            }

            // Select subset
            const filesToFetch = selectFilesToProcess(allFiles);
            console.log(`Processing ${filesToFetch.length} files for ${city.name}`);
            
            // Download and parse in parallel
            const rawDataPromises = filesToFetch.map(async (file, idx) => {
                if (idx % 5 === 0) setProgress(`Processing ${city.name}: ${file.name}`);
                const content = await fetchRawCSV(file.download_url);
                const date = file.name.replace('.csv', '');
                return parseCSV(content, date, productMap);
            });

            const dailyProducts = await Promise.all(rawDataPromises);
            
            // Filter out empty days
            const validDays = dailyProducts.filter(d => d.length > 0);
            if (validDays.length === 0) {
                errors.push(`${city.name}: Files downloaded but no valid products found. Check CSV format.`);
                continue;
            }

            // Calculate City CPI
            const points = calculateSingleCityCPI(validDays);
            if (points.length > 0) {
                cityResults.push({ cityId: city.id, points });
            } else {
                errors.push(`${city.name}: Insufficient data to calculate CPI (needs overlapping categories).`);
            }
        }

        if (cityResults.length === 0) {
             const detail = errors.join(" ");
             throw new Error(`Failed to process any city data. ${detail || "Check network/console."}`);
        }

        setProgress("Aggregating National CPI...");
        const nationalData = aggregateNationalCPI(cityResults, CITIES);
        
        setData(nationalData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const downloadCSV = () => {
    if (!data) return;
    
    const headers = ['Date', 'National CPI', 'Inflation MoM%', 'Cochabamba', 'La Paz', 'Santa Cruz'];
    const rows = data.points.map(p => {
      const cityVals = CITIES.map(c => p.cityBreakdown?.[c.name]?.toFixed(2) || '');
      return [
        p.date,
        p.cpi.toFixed(2),
        p.inflation.toFixed(2),
        ...cityVals
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bolivia_cpi_data_${data.lastUpdated}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMethodology = () => {
    const lines = [];
    lines.push("BOLIVIA CPI TRACKER - METHODOLOGY & DATA STRUCTURE");
    lines.push("=================================================");
    lines.push("");
    lines.push("1. DATA SOURCE");
    lines.push("--------------");
    lines.push("This tracker uses daily scraping data from Hipermaxi supermarkets in three cities:");
    CITIES.forEach(c => lines.push(`- ${c.name} (Source: ${c.path})`));
    lines.push("Repository: https://github.com/mauforonda/precios");
    lines.push("");
    
    lines.push("2. CALCULATION PIPELINE");
    lines.push("-----------------------");
    lines.push("Step A: Product Cleaning & Mapping");
    lines.push("Raw product IDs are matched against a static product dictionary.");
    lines.push("Products are assigned to standard supermarket categories, then mapped to Official Government Categories (see Section 5).");
    lines.push("");
    lines.push("Step B: Geometric Mean Aggregation");
    lines.push("For every day and every category, we calculate the Geometric Mean of all available product prices.");
    lines.push("Formula: exp( mean( log(price_i) ) )");
    lines.push("This reduces the impact of outliers and high-variance items.");
    lines.push("");
    lines.push("Step C: Weighted Basket Construction");
    lines.push("Category averages are weighted according to their official importance in the Bolivian consumer basket.");
    lines.push("These weights are rescaled to sum to 100% for the specific subset of goods tracked (Food, Home Goods, etc).");
    lines.push("");
    lines.push("Step D: National Composite Index");
    lines.push("The National CPI is a weighted average of the three city indices.");
    lines.push("");

    lines.push("3. CITY WEIGHTS (National Aggregation)");
    lines.push("--------------------------------------");
    CITIES.forEach(c => lines.push(`${c.name}: ${(c.weight * 100).toFixed(2)}%`));
    lines.push("");

    lines.push("4. CATEGORY WEIGHTS (Rescaled for Basket)");
    lines.push("-----------------------------------------");
    Object.entries(CATEGORY_WEIGHTS).forEach(([cat, w]) => {
        lines.push(`${cat}: ${(w * 100).toFixed(1)}%`);
    });
    lines.push("");

    lines.push("5. CATEGORY MAPPING (Supermarket -> Official)");
    lines.push("---------------------------------------------");
    lines.push("Raw Category                  | Official Category");
    lines.push("------------------------------|------------------");
    Object.entries(CATEGORY_MAPPING).forEach(([raw, official]) => {
        lines.push(`${raw.padEnd(30)} | ${official}`);
    });
    
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bolivia_cpi_methodology.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onDownload={downloadCSV} onDownloadMethodology={downloadMethodology} hasData={!!data} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {loading && (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-slate-800">Loading Market Data</h2>
            <p className="text-slate-500 mt-2 text-sm">{progress}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Unable to Load Data</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">{error}</p>
            <p className="text-xs text-slate-400 mt-4">
                Note: This app relies on the live GitHub repository 'mauforonda/precios'. 
                GitHub API rate limits may apply.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="animate-fade-in space-y-2">
            <StatsCards data={data} />
            <Charts data={data} />
            
            <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                 <Info size={18} className="text-slate-500" />
                 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Methodology</h3>
              </div>
              <div className="p-6 text-sm text-slate-600 space-y-4 leading-relaxed">
                <p>
                  This live tracker processes daily scraping data from <strong>Hipermaxi supermarkets</strong> across Bolivia's three main metropolitan areas: Santa Cruz, La Paz, and Cochabamba. The Consumer Price Index (CPI) is constructed using a rigorous four-step pipeline designed to filter noise and align with official statistical standards.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">1. Mapping & Categorization</h4>
                    <p className="text-slate-500">
                      Raw product data is cleaned and mapped to official government CPI categories (e.g., <em>Alimentos y Bebidas</em>, <em>Recreación y Cultura</em>) using a comprehensive product dictionary. Unmapped items are excluded to ensure consistency.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">2. Geometric Mean Aggregation</h4>
                    <p className="text-slate-500">
                       To handle price volatility and outliers, we calculate the <strong>Geometric Mean</strong> of prices within each category for every day. This prevents single expensive items from skewing the category average.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">3. Weighted Basket Construction</h4>
                    <p className="text-slate-500">
                      Official weights are applied to the category averages to create a synthetic "Basket Price" for each city. The weights are: <em>Alimentos y Bebidas (57.7%)</em>, <em>Bienes Diversos (16.1%)</em>, <em>Recreación (13.2%)</em>, and <em>Muebles (13.0%)</em>.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">4. National Composite Index</h4>
                    <p className="text-slate-500">
                      The final National CPI is a weighted average of the three city indices based on their economic weight: <strong>Santa Cruz (41.5%)</strong>, <strong>La Paz (39.1%)</strong>, and <strong>Cochabamba (19.4%)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;