import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");

if (rootElement) {
  let root = (rootElement as any)._reactRoot;
  if (!root) {
    root = ReactDOM.createRoot(rootElement);
    (rootElement as any)._reactRoot = root;
  }

  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}