import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Importamos el Router
import App from "./App.tsx";
import "./index.css";

// Usamos el basename para que coincida con tu repositorio de GitHub
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename="/Check-In-Front">
    <App />
  </BrowserRouter>
);
