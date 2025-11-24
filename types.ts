export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

export interface RawProduct {
  producto: string;
  categoria: string;
  precio: number;
  date: string;
}

export interface ProductMapItem {
  id: string;
  productName: string;
  category: string;
}

export interface BasketItem {
  category: string;
  govCategory: string;
  price: number;
  count: number;
}

export interface CPIPoint {
  date: string; // YYYY-MM-DD
  cpi: number;
  inflation: number; // Month-over-month
  details: Record<string, number>; // Price index per Gov Category
  cityBreakdown?: Record<string, number>; // CPI per city for this date
}

export interface CPIData {
  points: CPIPoint[];
  currentCPI: number;
  currentInflation: number;
  yoyInflation: number; // Year-over-year inflation
  lastUpdated: string;
  categories: Record<string, number>; // Current weighted contribution (National)
  cityTrends: Record<string, CPIPoint[]>; // Historical data per city
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface CityConfig {
  id: string;
  name: string;
  path: string; // GitHub path
  weight: number; // Contribution to National CPI
}

// Corrected paths and precise weights based on user specification
export const CITIES: CityConfig[] = [
  { 
    id: 'cochabamba', 
    name: 'Cochabamba', 
    path: 'data/hipermaxi/cochabamba', 
    weight: 0.1943110633 
  },
  { 
    id: 'lapaz', 
    name: 'La Paz', 
    path: 'data/hipermaxi/la_paz', 
    weight: 0.3909745579 
  },
  { 
    id: 'santacruz', 
    name: 'Santa Cruz', 
    path: 'data/hipermaxi/santa_cruz', 
    weight: 0.4147143788 
  }
];

export const CATEGORY_MAPPING: Record<string, string> = {
  "Abarrotes": "Alimentos y Bebidas",
  "Bebidas": "Alimentos y Bebidas",
  "Carnes": "Alimentos y Bebidas",
  "Congelados": "Alimentos y Bebidas",
  "Fiambres": "Alimentos y Bebidas",
  "Frutas y Verduras": "Alimentos y Bebidas",
  "Granos y Hortalizas": "Alimentos y Bebidas",
  "Lácteos y Derivados": "Alimentos y Bebidas",
  "Panadería": "Alimentos y Bebidas",
  "Pastelería y Masas Típicas": "Alimentos y Bebidas",
  "Bazar": "Muebles, Bienes y Servicios Domésticos",
  "Bazar Importación": "Muebles, Bienes y Servicios Domésticos",
  "Cuidado del Hogar": "Muebles, Bienes y Servicios Domésticos",
  "Cuidado Personal": "Bienes y Servicios Diversos",
  "Cuidado del Bebé": "Bienes y Servicios Diversos",
  "Juguetería": "Recreación y Cultura",
  "Juguetería Importación": "Recreación y Cultura"
};

// Weights normalized to sum to 100% of the tracked basket
// Used for reconstructing the 'Weighted Price' in the pipeline
export const CATEGORY_WEIGHTS: Record<string, number> = {
  "Alimentos y Bebidas": 0.577,
  "Muebles, Bienes y Servicios Domésticos": 0.130,
  "Recreación y Cultura": 0.132,
  "Bienes y Servicios Diversos": 0.161
};