import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { PERFUMES } from '../constants';
import { Perfume } from '../types';

interface ProductsContextValue {
  /** Todos los productos (incluye ocultos) — para el admin. */
  products: Perfume[];
  /** Solo los visibles — para la tienda. */
  visibleProducts: Perfume[];
  loading: boolean;
  /** 'firebase' si los datos vienen de Firestore, 'local' si usa el catálogo incluido. */
  source: 'firebase' | 'local';
}

const ProductsContext = createContext<ProductsContextValue>({
  products: PERFUMES,
  visibleProducts: PERFUMES,
  loading: false,
  source: 'local',
});

export const useProducts = () => useContext(ProductsContext);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Perfume[]>(PERFUMES);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [source, setSource] = useState<'firebase' | 'local'>('local');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (snap.empty) {
          // Firestore aún sin productos: mostrar el catálogo incluido.
          setProducts(PERFUMES);
          setSource('local');
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Perfume, 'id'>) }));
          setProducts(list);
          setSource('firebase');
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[Äura] Error leyendo productos de Firestore, usando catálogo local:', err);
        setProducts(PERFUMES);
        setSource('local');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const visibleProducts = products.filter((p) => p.visible !== false);

  return (
    <ProductsContext.Provider value={{ products, visibleProducts, loading, source }}>
      {children}
    </ProductsContext.Provider>
  );
};
