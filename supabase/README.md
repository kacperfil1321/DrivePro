# Konfiguracja Supabase

Przed dodawaniem instruktorów wykonaj migrację
`migrations/20261123_add_instructor_account_fields.sql` w Supabase SQL Editor.

Aktualny frontend tworzy konto przez Supabase Auth i zapisuje profil w tabeli
`public.instruktorzy`. Nie wywołuje funkcji Edge
`create-instructor-account`, więc jej wdrożenie nie jest wymagane.

Po zmianie frontendu uruchom ponownie aplikację lokalnie albo zbuduj i wdróż
najnowszą wersję aplikacji. Jeśli nadal pojawia się komunikat o Edge Function,
przeglądarka lub hosting serwuje starszy bundle.
