// src/context/CatalogContext.jsx — catalog API với fallback lookbook mock.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PRODUCTS, findProduct as findMock } from '../data/products';
import {
  loadCatalogOrMock,
  categoriesFrom,
  relatedFrom,
  wearWithFrom,
  colorFacetsFrom,
  rememberProduct,
} from '../services/catalog';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [fromApi, setFromApi] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCatalogOrMock()
      .then(({ products: list, fromApi: api }) => {
        if (cancelled) return;
        setProducts(list);
        setFromApi(api);
        list.forEach(rememberProduct);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => {
    const categories = categoriesFrom(products);
    return {
      products,
      categories,
      fromApi,
      ready,
      empty: ready && products.length === 0,
      find: (idOrSlug) => {
        const found = products.find((p) => String(p.id) === String(idOrSlug) || p.slug === idOrSlug);
        if (found) return found;
        return fromApi ? null : findMock(idOrSlug);
      },
      related: (product, n = 4) => relatedFrom(products, product, n),
      wearWith: (product, n = 3) => wearWithFrom(products, product, n),
      colorFacets: colorFacetsFrom(products),
    };
  }, [products, fromApi, ready]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    return {
      products: PRODUCTS,
      categories: categoriesFrom(PRODUCTS),
      fromApi: false,
      ready: true,
      empty: false,
      find: findMock,
      related: (p, n) => relatedFrom(PRODUCTS, p, n),
      wearWith: (p, n) => wearWithFrom(PRODUCTS, p, n),
      colorFacets: colorFacetsFrom(PRODUCTS),
    };
  }
  return ctx;
}

export default CatalogContext;
