-- Ejecutar una vez en el SQL Editor del proyecto anterior de Supabase.
-- Una fila por participación terminada; "data" conserva el JSON completo.
-- Si la tabla ya existe, se cancela la operación sin modificarla.
begin;

create table public.famous_people_attribute (
  session_id uuid generated always as ((data ->> 'session_id')::uuid) stored constraint famous_people_attribute_session_id_key primary key,
  participant_id uuid generated always as ((data ->> 'participant_id')::uuid) stored not null,
  received_at timestamptz not null default now(),
  experiment_version text generated always as (data ->> 'experiment_version') stored,
  age smallint generated always as ((data #>> '{participant,age}')::smallint) stored,
  sex text generated always as (data #>> '{participant,sex}') stored,
  data jsonb not null,
  constraint famous_people_attribute_object check (jsonb_typeof(data) = 'object'),
  constraint famous_people_attribute_completed check ((data -> 'completed' = 'true'::jsonb) is true),
  constraint famous_people_attribute_participant check (
    (session_id = participant_id
      and data #>> '{participant,participant_id}' = participant_id::text) is true
  ),
  constraint famous_people_attribute_trials check (
    (jsonb_typeof(data -> 'trials') = 'array'
      and jsonb_array_length(data -> 'trials') > 0) is true
  ),
  constraint famous_people_attribute_demographics check (
    (age between 18 and 120
      and sex in ('Femenino', 'Masculino', 'Prefiero no decirlo')) is true
  )
);

alter table public.famous_people_attribute enable row level security;

-- Retirar los permisos automáticos y permitir únicamente enviar resultados.
revoke all on table public.famous_people_attribute from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (data) on public.famous_people_attribute to anon, authenticated;

create policy "submit_completed_session"
  on public.famous_people_attribute
  for insert
  to anon, authenticated
  with check (true);

-- No se crean políticas de lectura, modificación ni borrado.
comment on table public.famous_people_attribute is
  'Resultados del experimento de personajes y atributos; una fila por sesión completada.';
comment on column public.famous_people_attribute.data is
  'JSON completo: datos demográficos, consentimiento, ensayos, respuestas, tiempos, órdenes e interacciones.';

notify pgrst, 'reload schema';
commit;
