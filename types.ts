export interface Dress {
  id: string;
  imageData: string; // Base64 string
  category: string;
  color: string;
  occasion: string;
  lastWorn: string | null; // ISO Date string
  createdAt: string;
}

export interface AnalysisResult {
  category: string;
  color: string;
  occasion: string;
}

export type View = 'home' | 'wardrobe' | 'upload';

export enum FilterOption {
  ALL = 'All',
  CASUAL = 'Casual',
  FORMAL = 'Formal',
  PARTY = 'Party',
  WORK = 'Work'
}