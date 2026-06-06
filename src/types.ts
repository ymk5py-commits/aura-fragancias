
export type Category = 'Daily' | 'Casual' | 'Night';
export type Gender = 'Man' | 'Woman' | 'Unisex';
export type Badge = 'Bestseller' | 'Recommended' | 'New';

export interface Perfume {
  code: string;
  name: string;
  inspiration: string;
  family: string;
  notes: string[];
  intensity: number; // 1-5
  duration: string;
  gender: Gender;
  category: Category;
  badge?: Badge;
  imageUrl: string;
}

export interface CartItem {
  id: string; // unique id for each entry in cart
  perfume: Perfume;
  size: string;
  price: number;
  quantity: number;
}

export interface WholesaleScale {
  units: string;
  discount: string;
}