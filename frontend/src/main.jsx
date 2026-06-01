import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import Vote from "./modes/public/Vote.jsx";
import Dev from "./modes/dev/Dev.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Vote /> }, // modo Publico (amigos votan)
  { path: "/dev/*", element: <Dev /> }, // modo Dev (solo Pako)
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
