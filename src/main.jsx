import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";

Sentry.init({
  dsn: "https://d06f89d2ae2f78688093d9a475013f04@o4511551526928384.ingest.de.sentry.io/4511551540887632",
  sendDefaultPii: false,        // keine personenbezogenen Daten – DSGVO-konform
  environment: "production",
});

createRoot(document.getElementById("root")).render(<App />);
