-- ==============================================================================
-- JEDNA PROSTA TABELA DYSPOZYCJI I GRAFIKU INSTRUKTORÓW
-- ==============================================================================
-- 1. Instruktor zgłasza dyspozycję na dany dzień (status = 'oczekuje')
-- 2. Administrator w terminarzu zatwierdza dzień lub koryguje godziny (status = 'zatwierdzona')
-- 3. Kursanci widzą dostępne sloty wyłącznie dla dni ze statusem 'zatwierdzona'

CREATE TABLE IF NOT EXISTS public.dyspozycje_instruktorow (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_instruktora bigint NOT NULL,
  data date NOT NULL,
  godzina_od time without time zone NOT NULL,
  godzina_do time without time zone NOT NULL,
  status text NOT NULL DEFAULT 'oczekuje' CHECK (status IN ('szkic', 'oczekuje', 'zatwierdzona', 'odrzucona')),
  uwagi text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT dyspozycje_instruktorow_pkey PRIMARY KEY (id),
  CONSTRAINT fk_dyspozycja_instruktor FOREIGN KEY (id_instruktora) REFERENCES public.instruktorzy(id) ON DELETE CASCADE,
  CONSTRAINT unq_instruktor_data UNIQUE (id_instruktora, data)
);

CREATE INDEX IF NOT EXISTS idx_dyspozycje_instruktor_data ON public.dyspozycje_instruktorow(id_instruktora, data);
CREATE INDEX IF NOT EXISTS idx_dyspozycje_status ON public.dyspozycje_instruktorow(status);

-- Usunięcie starych tabel, jeśli istniały:
-- DROP TABLE IF EXISTS public.grafik_instruktorow CASCADE;
-- DROP TABLE IF EXISTS public.szczegoly_dyspozycji CASCADE;
-- DROP TABLE IF EXISTS public.wyjatki_dyspozycyjnosci CASCADE;
-- DROP TABLE IF EXISTS public.dyspozycyjnosc_instruktorow CASCADE;
