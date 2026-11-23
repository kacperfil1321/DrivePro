import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brak konfiguracji Edge Function.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const authorization = request.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wymagane zalogowanie.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: userResult, error: userError } = await caller.auth.getUser()
    if (userError || !userResult.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidłowa sesja.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await request.json()
    const imie = String(body.imie || '').trim()
    const nazwisko = String(body.nazwisko || '').trim()
    const telefon = body.telefon ? String(body.telefon).trim() : null
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const etat = String(body.etat || 'pełny etat')

    if (!imie || !nazwisko || !email || password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidłowe dane instruktora.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { imie, nazwisko, telefon, role: 'instructor' },
    })
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || 'Nie udało się utworzyć konta.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: instructor, error: instructorError } = await admin
      .from('instruktorzy')
      .insert({
        imie,
        nazwisko,
        telefon,
        etat,
        user_id: authData.user.id,
        email,
      })
      .select('*')
      .single()

    if (instructorError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ success: false, error: instructorError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, instructor }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Nieoczekiwany błąd serwera.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
