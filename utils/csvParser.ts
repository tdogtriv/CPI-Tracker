import { RawProduct, CPIPoint, CPIData, CATEGORY_MAPPING, CATEGORY_WEIGHTS, ProductMapItem, CityConfig } from '../types';

// Detect delimiter based on the first few lines
function detectDelimiter(content: string): string {
    const lines = content.split('\n').slice(0, 5);
    let commaCount = 0;
    let semicolonCount = 0;
    
    lines.forEach(line => {
        commaCount += (line.match(/,/g) || []).length;
        semicolonCount += (line.match(/;/g) || []).length;
    });
    
    return semicolonCount > commaCount ? ';' : ',';
}

function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Helper to parse localized numbers (e.g. "1.200,50" or "12,50")
function parsePrice(str: string): number {
    if (!str) return 0;
    
    // clean currency symbols and spaces
    let clean = str.replace(/[^\d.,-]/g, '').trim();
    
    // Check format
    if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) {
        // Mixed: assume 1.000,00 (Spanish) -> remove dots, replace comma
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.indexOf(',') > -1) {
        // Comma only: assume decimal separator -> replace with dot
        clean = clean.replace(',', '.');
    }
    // If dot only, assume standard float
    
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

export function parseProductMap(content: string): Record<string, ProductMapItem> {
    const map: Record<string, ProductMapItem> = {};
    const delimiter = detectDelimiter(content);
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    if (lines.length < 2) return map;
    const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase());
    
    const idxId = headers.findIndex(h => h.includes('id') || h.includes('code'));
    const idxName = headers.findIndex(h => h.includes('producto') || h.includes('nombre'));
    const idxCat = headers.findIndex(h => h.includes('categoria') || h.includes('grupo'));

    const iId = idxId !== -1 ? idxId : 0;
    const iName = idxName !== -1 ? idxName : 1;
    const iCat = idxCat !== -1 ? idxCat : 2;

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter);
        if (cols.length <= Math.max(iId, iName, iCat)) continue;
        
        const id = cols[iId];
        // Clean quotes from ID if present
        const cleanId = id.replace(/['"]/g, '');
        
        if (cleanId) {
            map[cleanId] = {
                id: cleanId,
                productName: cols[iName] || 'Unknown',
                category: cols[iCat] || 'Unknown'
            };
        }
    }
    return map;
}

// Helper to fix bad dates like '0025'
function fixDate(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.startsWith('0025')) {
        return dateStr.replace('0025', '2025');
    }
    return dateStr;
}

export function parseCSV(content: string, filenameDate: string, productMap: Record<string, ProductMapItem> | null): RawProduct[] {
    const delimiter = detectDelimiter(content);
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase());
  
    const idxProduct = headers.findIndex(h => h.includes('producto') || h.includes('product'));
    const idxCategory = headers.findIndex(h => h.includes('categoria') || h.includes('category'));
    const idxPrice = headers.findIndex(h => h.includes('precio') || h.includes('price'));
    const idxId = headers.findIndex(h => h.includes('id') || h.includes('code') || h.includes('sku'));
    const idxDate = headers.findIndex(h => h.includes('fecha') || h.includes('date'));

    const pIdx = idxProduct !== -1 ? idxProduct : -1;
    const cIdx = idxCategory !== -1 ? idxCategory : -1;
    const prIdx = idxPrice !== -1 ? idxPrice : -1;
    const idIdx = idxId;

    // If we can't find price, we can't use this file
    if (prIdx === -1) {
        // Fallback: assume last column is price?
        // Let's rely on standard structure: fecha, id, precio...
    }

    const products: RawProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter);
        if (cols.length < 2) continue;

        // Parse Price
        let priceVal = 0;
        if (prIdx !== -1 && cols[prIdx]) {
            priceVal = parsePrice(cols[prIdx]);
        } else {
            // Last resort: try to find a number in typical positions
            // Usually price is 3rd column or last
            const val = parsePrice(cols[2]);
            if (val > 0) priceVal = val;
        }

        if (priceVal <= 0) continue;

        // Product & Category Info
        let productName = "Item";
        let categoryName = "Uncategorized";
        let foundInMap = false;

        // Try map first
        if (productMap && idIdx !== -1 && cols[idIdx]) {
            const rawId = cols[idIdx].replace(/['"]/g, '');
            if (productMap[rawId]) {
                const info = productMap[rawId];
                productName = info.productName;
                categoryName = info.category;
                foundInMap = true;
            }
        }

        // Fallback to columns if not in map
        if (!foundInMap) {
            if (pIdx !== -1) productName = cols[pIdx] || productName;
            if (cIdx !== -1) categoryName = cols[cIdx] || categoryName;
        }

        // Date Handling
        let rowDate = filenameDate;
        if (idxDate !== -1 && cols[idxDate]) {
            const d = cols[idxDate];
            if (d.includes('-') || d.includes('/')) {
                rowDate = d;
            }
        }
        rowDate = fixDate(rowDate);

        products.push({
            producto: productName,
            categoria: categoryName,
            precio: priceVal,
            date: rowDate
        });
    }

    return products;
}

interface DailyCategoryStats {
    date: string;
    // Stores Geometric Mean of prices for the category
    categoryAvgPrices: Record<string, number>; 
}

// Based on the R Pipeline: Raw -> Geometric Mean per Cat -> Map to Gov -> Apply Weight -> Sum -> Index
export function calculateSingleCityCPI(rawDailyData: RawProduct[][]): CPIPoint[] {
    const flatData = rawDailyData.flat();
    
    const grouped: Record<string, Record<string, number[]>> = {};

    flatData.forEach(p => {
        if (!p.date) return;
        if (!grouped[p.date]) grouped[p.date] = {};
        if (!grouped[p.date][p.categoria]) grouped[p.date][p.categoria] = [];
        grouped[p.date][p.categoria].push(p.precio);
    });

    const dailyStats: DailyCategoryStats[] = Object.keys(grouped).sort().map(date => {
        const cats = grouped[date];
        const categoryAvgPrices: Record<string, number> = {};
        
        Object.entries(cats).forEach(([cat, prices]) => {
            if (prices.length > 0) {
                // Geometric Mean: exp(mean(log(p)))
                const sumLn = prices.reduce((acc, val) => acc + Math.log(val), 0);
                const avgLn = sumLn / prices.length;
                categoryAvgPrices[cat] = Math.exp(avgLn);
            }
        });
        
        return { date, categoryAvgPrices };
    });

    if (dailyStats.length === 0) return [];

    // Calculate Daily Basket Value (P)
    const dailyBasketValues = dailyStats.map(stat => {
        let P = 0;
        const categoryDetails: Record<string, number> = {};

        Object.entries(stat.categoryAvgPrices).forEach(([supermarketCat, avgPrice]) => {
            const govCat = CATEGORY_MAPPING[supermarketCat];
            if (govCat && CATEGORY_WEIGHTS[govCat]) {
                const weight = CATEGORY_WEIGHTS[govCat];
                const contribution = weight * avgPrice;
                P += contribution;
                categoryDetails[govCat] = (categoryDetails[govCat] || 0) + contribution;
            }
        });

        return { date: stat.date, P, categoryDetails };
    });

    // Find base P (first valid day)
    const validDays = dailyBasketValues.filter(d => d.P > 0);
    if (validDays.length === 0) return [];
    
    const baseP = validDays[0].P;

    const points: CPIPoint[] = dailyBasketValues.map(day => {
        if (day.P === 0) return { date: day.date, cpi: 0, inflation: 0, details: {} };

        const cpi = (day.P / baseP) * 100;
        const details: Record<string, number> = {};
        Object.entries(day.categoryDetails).forEach(([govCat, val]) => {
            details[govCat] = (val / baseP) * 100; 
        });

        return {
            date: day.date,
            cpi,
            inflation: 0,
            details
        };
    });

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].cpi;
        const curr = points[i].cpi;
        if (prev > 0) {
            points[i].inflation = ((curr - prev) / prev) * 100;
        }
    }

    return points;
}

export function aggregateNationalCPI(cityData: { cityId: string, points: CPIPoint[] }[], cityConfigs: CityConfig[]): CPIData {
    // Align dates
    const allDates = new Set<string>();
    cityData.forEach(c => c.points.forEach(p => {
        if (p.cpi > 0) allDates.add(p.date);
    }));
    const sortedDates = Array.from(allDates).sort();

    const nationalPoints: CPIPoint[] = sortedDates.map(date => {
        let nationalCPI = 0;
        const cityBreakdown: Record<string, number> = {};
        let usedWeights = 0;

        cityConfigs.forEach(city => {
            const cData = cityData.find(d => d.cityId === city.id);
            const point = cData?.points.find(p => p.date === date);
            
            if (point && point.cpi > 0) {
                nationalCPI += point.cpi * city.weight;
                cityBreakdown[city.name] = point.cpi;
                usedWeights += city.weight;
            }
        });

        if (usedWeights > 0 && usedWeights < 0.999) {
            nationalCPI = nationalCPI / usedWeights; 
        }

        return {
            date,
            cpi: nationalCPI,
            inflation: 0,
            details: {}, 
            cityBreakdown
        };
    });

    // Calculate National Inflation (Period over Period)
    for (let i = 1; i < nationalPoints.length; i++) {
        const prev = nationalPoints[i - 1].cpi;
        const curr = nationalPoints[i].cpi;
        if (prev > 0) {
            nationalPoints[i].inflation = ((curr - prev) / prev) * 100;
        }
    }

    const lastPoint = nationalPoints[nationalPoints.length - 1];

    // Calculate YoY Inflation
    let yoyInflation = 0;
    if (lastPoint) {
        try {
            const lastDate = new Date(lastPoint.date);
            // Target date: exactly 1 year ago
            const targetDate = new Date(lastDate);
            targetDate.setFullYear(lastDate.getFullYear() - 1);
            
            // Tolerance: +/- 7 days to account for weekends/missing data/sampling
            const tolerance = 7 * 24 * 60 * 60 * 1000; 
            const targetTime = targetDate.getTime();

            let closestPoint: CPIPoint | null = null;
            let minDiff = tolerance;

            for (const p of nationalPoints) {
                const pTime = new Date(p.date).getTime();
                const diff = Math.abs(pTime - targetTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestPoint = p;
                }
            }

            if (closestPoint && closestPoint.cpi > 0) {
                yoyInflation = ((lastPoint.cpi / closestPoint.cpi) - 1) * 100;
            }
        } catch (e) {
            console.warn("Error calculating YoY", e);
        }
    }

    // Category breakdown logic (simplified for national view)
    const latestCategories: Record<string, number> = {};
    if (lastPoint) {
         cityConfigs.forEach(city => {
            const cData = cityData.find(d => d.cityId === city.id);
            const point = cData?.points.find(p => p.date === lastPoint.date);
            if (point) {
                Object.entries(point.details).forEach(([cat, val]) => {
                    latestCategories[cat] = (latestCategories[cat] || 0) + (val * city.weight);
                });
            }
        });
    }

    const cityTrends: Record<string, CPIPoint[]> = {};
    cityData.forEach(cd => {
        const config = cityConfigs.find(c => c.id === cd.cityId);
        if (config) {
            cityTrends[config.name] = cd.points;
        }
    });

    return {
        points: nationalPoints,
        currentCPI: lastPoint ? lastPoint.cpi : 0,
        currentInflation: lastPoint ? lastPoint.inflation : 0,
        yoyInflation,
        lastUpdated: lastPoint ? lastPoint.date : '',
        categories: latestCategories,
        cityTrends
    };
}