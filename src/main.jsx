import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

if (typeof document !== "undefined") {
  const isLoggedIn = window.localStorage.getItem("rankify_is_logged_in") === "true";
  const storedTheme = window.localStorage.getItem("rankify-theme");
  const theme = isLoggedIn && storedTheme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
