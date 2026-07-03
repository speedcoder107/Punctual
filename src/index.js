import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize localStorage shim for the app
window.storage = {
  get: async (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? { value } : { value: null };
    } catch (e) {
      return { value: null };
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example, reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
