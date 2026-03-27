import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PortfolioProvider } from "./context/PortfolioContext";
import { ToastProvider } from "./components/ToastProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PortfolioProvider>
          <App />
        </PortfolioProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
