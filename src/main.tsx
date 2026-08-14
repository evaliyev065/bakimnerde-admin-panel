import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AuthProvider } from "./auth/AuthContext";
import { PreferencesProvider } from "./app/PreferencesContext";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><PreferencesProvider><AuthProvider><App /></AuthProvider></PreferencesProvider></BrowserRouter></StrictMode>
);
