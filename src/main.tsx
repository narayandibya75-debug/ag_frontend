import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FarmProvider } from "./lib/farm";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FarmProvider>
      <App />
    </FarmProvider>
  </StrictMode>
);
