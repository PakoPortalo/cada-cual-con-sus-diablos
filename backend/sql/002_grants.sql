-- Permisos para el backend (service_role) sobre las tablas.
-- Necesario porque desactivamos "Automatically expose new tables": Supabase no
-- concede privilegios automaticamente a las tablas nuevas. Aqui se los damos
-- SOLO a service_role (el backend). anon/authenticated siguen SIN acceso, asi
-- que desde fuera nadie puede leer/escribir directamente: todo pasa por la API.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Y que aplique tambien a futuras tablas del esquema.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
