import { GitHubFile } from '../types';

const REPO_OWNER = 'mauforonda';
const REPO_NAME = 'precios';

export async function fetchDirectoryListing(path: string): Promise<GitHubFile[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
        headers: {
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (!response.ok) {
      console.warn(`Directory request failed for ${path}: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    
    if (Array.isArray(data)) {
        return (data as GitHubFile[])
        .filter(file => file.name.endsWith('.csv'))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch directory listing for ${path}`, error);
    return [];
  }
}

export async function fetchFileContent(path: string): Promise<string | null> {
    try {
        const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/${path}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch file: ${path}`, error);
        return null;
    }
}

export async function fetchRawCSV(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }
  return await response.text();
}

export async function fetchUSDTData(): Promise<string | null> {
    // Try multiple potential paths for the dataset to ensure robustness
    const urls = [
        'https://raw.githubusercontent.com/mauforonda/dolares/main/data/buy.csv',
        'https://raw.githubusercontent.com/mauforonda/dolares/master/data/buy.csv',
        'https://raw.githubusercontent.com/mauforonda/dolares/main/buy.csv'
    ];

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                // Basic validation to ensure we didn't get a 200 OK HTML page
                if (text.length > 20 && !text.trim().startsWith('<')) {
                    return text;
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch USDT data from ${url}`, error);
        }
    }
    console.error("All USDT data fetch attempts failed");
    return null;
}

/**
 * Selects a sampling of files to avoid fetching hundreds of daily files.
 * Strategy: 
 * 1. Base period (first file)
 * 2. 1 per month for historical context
 * 3. Last 45 days for daily precision
 * 4. Exact match for 1 year ago (relative to last file) for YoY calculation
 */
export function selectFilesToProcess(allFiles: GitHubFile[]): GitHubFile[] {
  if (allFiles.length === 0) return [];
  
  const sortedFiles = [...allFiles].sort((a, b) => a.name.localeCompare(b.name));
  const selected: GitHubFile[] = [];
  const seenMonths = new Set<string>();
  
  // 1. Base period
  selected.push(sortedFiles[0]);
  seenMonths.add(sortedFiles[0].name.substring(0, 7)); // YYYY-MM

  const lastFile = sortedFiles[sortedFiles.length - 1];
  
  // Calculate target date for YoY (1 year before last file)
  // Assuming filename format YYYY-MM-DD.csv
  let yearAgoTarget = "";
  try {
      const lastDateStr = lastFile.name.replace('.csv', '');
      const d = new Date(lastDateStr);
      if (!isNaN(d.getTime())) {
          d.setFullYear(d.getFullYear() - 1);
          yearAgoTarget = d.toISOString().split('T')[0];
      }
  } catch (e) {
      console.warn("Could not determine YoY target date");
  }

  // 2. Historical sampling (1 per month)
  // Iterate until the last 45 files
  const cutoffIndex = Math.max(1, sortedFiles.length - 45);
  
  for (let i = 1; i < cutoffIndex; i++) {
    const file = sortedFiles[i];
    const month = file.name.substring(0, 7);
    
    // Check if this file is our YoY target (or very close to it)
    const isYoYTarget = yearAgoTarget && file.name.includes(yearAgoTarget);

    if (!seenMonths.has(month) || isYoYTarget) {
      selected.push(file);
      seenMonths.add(month);
    }
  }

  // 3. Live daily data (Last 45 files)
  const lastFiles = sortedFiles.slice(cutoffIndex);
  
  // Merge and deduplicate
  const finalSet = new Set([...selected, ...lastFiles]);
  
  // Ensure we sort strictly by name (date) again before returning
  return Array.from(finalSet).sort((a, b) => a.name.localeCompare(b.name));
}