import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import Vote from "./modes/public/Vote.jsx";
import Ejemplo from "./modes/public/Ejemplo.jsx";
import Dev from "./modes/dev/Dev.jsx";
import ErrorScreen from "./ErrorScreen.jsx";

const router = createBrowserRouter([
  {
    // Ruta "layout" sin path: renderiza sus hijos (Outlet por defecto) y captura
    // errores y rutas inexistentes con la pantalla fanzine.
    errorElement: <ErrorScreen />,
    children: [
      { path: "/", element: <Vote /> }, // modo Publico (amigos votan)
      { path: "/ejemplo", element: <Ejemplo /> }, // demo sin afectar a la votación
      { path: "/dev/*", element: <Dev /> }, // modo Dev (solo Pako)
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
