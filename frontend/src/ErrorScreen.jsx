import { useRouteError, isRouteErrorResponse } from "react-router-dom";

// Pantalla de error / 404 con la estética fanzine (en vez de la página de
// desarrollador por defecto de React Router). Captura rutas inexistentes y
// cualquier error de renderizado.
export default function ErrorScreen() {
  const err = useRouteError();
  const is404 = isRouteErrorResponse(err) && err.status === 404;
  return (
    <div className="cargando">
      <div className="cargando-em">{is404 ? "🤔" : "💀"}</div>
      <h1 className="error-title">{is404 ? "404" : "Algo ha fallado"}</h1>
      <p>{is404 ? "Esta página no existe" : "Vuelve a intentarlo"}</p>
      <a className="error-link" href="/">
        ← volver al principio
      </a>
    </div>
  );
}
