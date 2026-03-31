import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './store'; // <-- import store here

const BACKEND_BASE_URL = 'https://teknicitybackend.dockyardsoftware.com';
axios.defaults.baseURL = BACKEND_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Provider>
);

reportWebVitals();
