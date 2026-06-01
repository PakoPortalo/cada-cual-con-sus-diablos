-- Cada cual con sus diablos — esquema inicial.
-- Ejecutar en el SQL editor de Supabase (una vez creado el proyecto).

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla principal: los 100 diablos
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists diablos (
  id                  int primary key check (id between 1 and 100), -- 001–100
  nombre              text,
  imagen_original_url text,
  imagen_svg_url      text,
  votos_positivos     int  not null default 0,  -- 👿
  votos_negativos     int  not null default 0,  -- 💀
  score               double precision not null default 0, -- Wilson, recalculado al votar
  fecha_subida        timestamptz not null default now(),
  estado              text not null default 'pendiente'
                        check (estado in ('pendiente','activo','archivado'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Votantes: un registro por amigo. votante_id = uuid generado en el navegador y
-- guardado en localStorage. nombre opcional ("¿cómo te llamas?" o anónimo => null).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists votantes (
  votante_id text primary key,
  nombre     text,                                   -- null = anónimo
  creado_en  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Votos: un voto por (diablo, votante). Persistencia e idempotencia.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists votos (
  id         bigint generated always as identity primary key,
  diablo_id  int  not null references diablos(id) on delete cascade,
  votante_id text not null references votantes(votante_id) on delete cascade,
  valor      smallint not null check (valor in (-1, 1)), -- 1 = 👿, -1 = 💀
  creado_en  timestamptz not null default now(),
  unique (diablo_id, votante_id) -- no se puede votar dos veces el mismo diablo
);

create index if not exists votos_votante_idx on votos (votante_id);
create index if not exists diablos_estado_idx on diablos (estado);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: el backend usa la SERVICE ROLE KEY (salta RLS), asi que toda la logica
-- de acceso vive en la API. Dejamos RLS activada y SIN politicas publicas para
-- que la ANON key no pueda leer/escribir directamente.
-- ─────────────────────────────────────────────────────────────────────────────
alter table diablos   enable row level security;
alter table votantes  enable row level security;
alter table votos     enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: crear un bucket PUBLICO llamado "diablos" desde el dashboard
-- (Storage → New bucket → name: diablos, public: on) para servir los SVG/JPEG.
-- Las subidas las hace el backend con la service role key.
-- ─────────────────────────────────────────────────────────────────────────────
