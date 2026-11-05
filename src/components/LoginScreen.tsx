import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

type LoginRole = 'student' | 'instructor';

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [role, setRole] = useState<LoginRole>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registration, setRegistration] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    repeatedPassword: '',
  });
  const [registrationMessage, setRegistrationMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const isInstructor = role === 'instructor';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin();
  };

  const handleRegistrationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationMessage(null);

    if (role !== 'student') {
      setRegistrationMessage({ text: 'Rejestracja jest dostępna tylko dla kursantów.', type: 'error' });
      return;
    }

    if (registration.password !== registration.repeatedPassword) {
      setRegistrationMessage({ text: 'Podane hasła nie są takie same.', type: 'error' });
      return;
    }

    if (!supabase) {
      setRegistrationMessage({
        text: 'Brakuje konfiguracji Supabase. Uzupełnij VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w pliku .env.local.',
        type: 'error',
      });
      return;
    }

    setIsSubmittingRegistration(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: registration.email.trim(),
        password: registration.password,
        options: {
          data: {
            imie: registration.firstName.trim(),
            nazwisko: registration.lastName.trim(),
            telefon: registration.phone.trim(),
          },
        },
      });

      if (error) {
        setRegistrationMessage({ text: error.message, type: 'error' });
        return;
      }

      setRegistration((current) => ({ ...current, password: '', repeatedPassword: '' }));
      setRegistrationMessage({
        text: 'Konto kursanta zostało utworzone. Logowanie przez Supabase będzie kolejnym etapem integracji.',
        type: 'success',
      });
    } catch (error) {
      setRegistrationMessage({
        text: error instanceof Error
          ? `Nie udało się połączyć z Supabase: ${error.message}`
          : 'Wystąpił nieoczekiwany błąd podczas rejestracji.',
        type: 'error',
      });
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const selectRole = (nextRole: LoginRole) => {
    setRole(nextRole);
    setRegistrationMessage(null);
    if (nextRole === 'instructor') setIsRegistering(false);
  };

  return (
    <main className="login-page">
      <section className="login-layout" aria-label="Logowanie do DrivePro">
        <div className="login-intro">
          <div className="login-brand">
            <span className="login-brand-badge" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" width="27" height="27">
                <circle cx="18" cy="18" r="15.5" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="4.5" stroke="currentColor" strokeWidth="2.5" />
                <path d="M18 2.5v11M6.5 26.5l8-6M29.5 26.5l-8-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="login-brand-name">DrivePro</span>
          </div>

          <div className="login-intro-copy">
            <span className="login-eyebrow">{isInstructor ? 'Panel dla instruktorów' : 'Twoja droga do celu'}</span>
            <h1>{isInstructor ? 'Prowadź kursy. Resztę miej pod kontrolą.' : 'Wszystko, czego potrzebujesz, by zdać.'}</h1>
            <p>
              {isInstructor
                ? 'Zarządzaj jazdami i miej najważniejsze informacje o kursantach zawsze pod ręką.'
                : 'Miej swój kurs zawsze pod kontrolą. Sprawdzaj postępy, dokumenty i najbliższe jazdy w jednym miejscu.'}
            </p>
          </div>

          <div className="login-road-art" aria-hidden="true">
            <div className="login-road-glow" />
            <svg viewBox="0 0 520 230" fill="none">
              <path d="M-25 225C97 188 130 164 203 116c61-40 99-74 178-98 45-14 91-21 164-27" stroke="white" strokeOpacity=".16" strokeWidth="88" />
              <path d="M-25 225C97 188 130 164 203 116c61-40 99-74 178-98 45-14 91-21 164-27" stroke="white" strokeOpacity=".72" strokeWidth="2" strokeDasharray="9 12" />
              <circle cx="353" cy="57" r="31" fill="white" fillOpacity=".12" />
              <circle cx="353" cy="57" r="19" fill="white" fillOpacity=".15" />
              <path d="M353 44v12l8 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="login-intro-footer">
            <span className="login-status-dot" />
            <span>{isInstructor ? 'Twoi kursanci. Twój harmonogram. Jeden panel.' : 'Twój kurs. Twoje tempo. Jeden panel.'}</span>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-card">
            <div className="login-role-switch" role="group" aria-label="Wybierz rodzaj panelu">
              <button
                className={`login-role-option${!isInstructor ? ' active' : ''}`}
                type="button"
                aria-pressed={!isInstructor}
                onClick={() => selectRole('student')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                </svg>
                <span>Panel kursanta</span>
              </button>
              <button
                className={`login-role-option${isInstructor ? ' active' : ''}`}
                type="button"
                aria-pressed={isInstructor}
                onClick={() => selectRole('instructor')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 9h8M8 13h5M8 17h3" />
                  <circle cx="17" cy="14" r="2" />
                </svg>
                <span>Panel instruktora</span>
              </button>
            </div>

            <div className="login-card-heading">
              <span className="login-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="login-card-label">{isInstructor ? 'PANEL INSTRUKTORA' : 'PANEL KURSANTA'}</span>
              <h2>{isRegistering ? 'Utwórz konto kursanta' : 'Witaj ponownie'}</h2>
              <p>{isRegistering
                ? 'Wypełnij formularz, aby zgłosić rejestrację w DrivePro.'
                : `Zaloguj się, aby przejść do ${isInstructor ? 'panelu instruktora' : 'swojego panelu'}.`}</p>
            </div>

            {isRegistering ? (
              <form className="login-form registration-form" onSubmit={handleRegistrationSubmit}>
                <div className="registration-name-row">
                  <div className="registration-field">
                    <label className="login-label" htmlFor="register-first-name">Imię</label>
                    <input
                      className="registration-input"
                      id="register-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={registration.firstName}
                      onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })}
                      required
                    />
                  </div>
                  <div className="registration-field">
                    <label className="login-label" htmlFor="register-last-name">Nazwisko</label>
                    <input
                      className="registration-input"
                      id="register-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={registration.lastName}
                      onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })}
                      required
                    />
                  </div>
                </div>

                <label className="login-label" htmlFor="register-phone">Nr kontaktowy</label>
                <input
                  className="registration-input registration-input-spaced"
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  value={registration.phone}
                  onChange={(event) => setRegistration({ ...registration, phone: event.target.value })}
                  required
                />

                <label className="login-label" htmlFor="register-email">Adres e-mail</label>
                <input
                  className="registration-input registration-input-spaced"
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="np. anna@example.com"
                  value={registration.email}
                  onChange={(event) => setRegistration({ ...registration, email: event.target.value })}
                  required
                />

                <label className="login-label" htmlFor="register-password">Hasło</label>
                <input
                  className="registration-input registration-input-spaced"
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={registration.password}
                  onChange={(event) => setRegistration({ ...registration, password: event.target.value })}
                  required
                />

                <label className="login-label" htmlFor="register-repeat-password">Powtórz hasło</label>
                <input
                  className="registration-input registration-input-spaced"
                  id="register-repeat-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={registration.repeatedPassword}
                  onChange={(event) => setRegistration({ ...registration, repeatedPassword: event.target.value })}
                  required
                />

                <button
                  className="registration-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? 'Ukryj hasła' : 'Pokaż hasła'}
                </button>

                {registrationMessage && (
                  <p
                    className={`registration-message${registrationMessage.type === 'error' ? ' error' : ''}`}
                    role={registrationMessage.type === 'error' ? 'alert' : 'status'}
                  >
                    {registrationMessage.text}
                  </p>
                )}

                <button className="login-submit" type="submit" disabled={isSubmittingRegistration}>
                  <span>{isSubmittingRegistration ? 'Tworzenie konta…' : 'Zarejestruj konto'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  className="registration-back"
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setRegistrationMessage(null);
                  }}
                >
                  Wróć do logowania
                </button>
              </form>
            ) : (
              <>
                <form className="login-form" onSubmit={handleSubmit}>
                  <label className="login-label" htmlFor="login-email">Adres e-mail</label>
                  <div className="login-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="np. anna@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <label className="login-label" htmlFor="login-password">Hasło</label>
                  <div className="login-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="10" width="18" height="11" rx="2" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                    </svg>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Wpisz swoje hasło"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.2-2.5 3.3M6.2 6.2C3.9 7.6 2.5 9.7 2 12c.5 1.1 1.6 2.7 3.3 4a10.7 10.7 0 0 0 6.7 2.3c.8 0 1.6-.1 2.3-.3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button className="login-submit" type="submit">
                    <span>Zaloguj się</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>

                {!isInstructor && (
                  <p className="registration-prompt">
                    Nie masz konta?{' '}
                    <button type="button" onClick={() => setIsRegistering(true)}>Zarejestruj się</button>
                  </p>
                )}
              </>
            )}

            {!isRegistering && <div className="login-help">
              <span className="login-help-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1 .9-1.9 1.2-1.9 2.7M12 17h.01" />
                </svg>
              </span>
              <p>{isInstructor
                ? 'Nie masz jeszcze dostępu? Skontaktuj się z administratorem swojej szkoły jazdy.'
                : 'Nie masz jeszcze dostępu? Skontaktuj się ze swoją szkołą jazdy.'}</p>
            </div>}
          </div>

          <p className="login-legal">DrivePro <span>·</span> {isInstructor ? 'Panel instruktora' : 'Panel kursanta'}</p>
        </div>
      </section>
    </main>
  );
};

export default LoginScreen;
