import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase.js";
import Login from "./Login.jsx";
import Capture from "./Capture.jsx";
import Admin from "./Admin.jsx";

// Contenedor del modo Dev: gestiona la sesion de Supabase Auth y enruta
// captura / panel. Si no hay sesion, muestra el login.
export default function Dev() {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center">Cargando…</div>;
  if (!session) return <Login />;

  return (
    <div>
      <div className="topbar">
        <strong>👿 Dev</strong>
        <nav>
          <Link to="/dev">Captura</Link>
          <Link to="/dev/panel">Panel</Link>
          <a
            href="#salir"
            onClick={async (e) => {
              e.preventDefault();
              await supabase.auth.signOut();
              navigate("/dev");
            }}
          >
            Salir
          </a>
        </nav>
      </div>
      <div className="wrap">
        <Routes>
          <Route index element={<Capture />} />
          <Route path="panel" element={<Admin />} />
        </Routes>
      </div>
    </div>
  );
}
