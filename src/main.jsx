// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/motion.css';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <CatalogProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CatalogProvider>
    </AppProvider>
  </StrictMode>
);
