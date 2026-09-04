// src/main.jsx — điểm khởi động ứng dụng LYRA.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

const container = document.getElementById('root');

createRoot(container).render(
  <StrictMode>
    {/* AppProvider (định tuyến + phiên đăng nhập) bọc ngoài CartProvider */}
    <AppProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AppProvider>
  </StrictMode>
);
