import React, { useState } from 'react';
import { 
  signInWithGoogle, 
  loginWithEmail, 
  registerWithEmail 
} from '../firebase';
import { 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Mail, 
  Key, 
  ArrowRight, 
  AlertCircle, 
  UserCheck, 
  Activity,
  Layers,
  Database,
  CheckCircle2
} from 'lucide-react';
import { User } from 'firebase/auth';

interface LoginPageProps {
  onLoginSuccess: (user: User | { uid: string; email: string; displayName: string; photoURL?: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('La fenêtre de connexion Google a été fermée.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('La fenêtre popup a été bloquée par le navigateur. Veuillez autoriser les popups pour ce site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Opération de connexion annulée.');
      } else {
        setErrorMessage(err.message || 'Échec de l’authentification Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email & Password
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (authMode === 'login') {
        const user = await loginWithEmail(email.trim(), password);
        onLoginSuccess(user);
      } else {
        const user = await registerWithEmail(email.trim(), password);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Identifiants incorrects. Vérifiez votre e-mail et mot de passe.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Cet e-mail est déjà associé à un compte. Veuillez vous connecter.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Adresse e-mail invalide.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage('La connexion par e-mail n\'est pas activée sur la console Firebase. Veuillez utiliser la connexion Google.');
      } else {
        setErrorMessage(err.message || 'Erreur lors de la tentative de connexion.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo / Quick Access Bypass for testing
  const handleDemoAccess = (role: 'manager' | 'viewer') => {
    const demoUser = {
      uid: `demo-${role}-${Date.now()}`,
      email: role === 'manager' ? 'ops.manager.gops@gmail.com' : 'superviseur.planning@cortex.io',
      displayName: role === 'manager' ? 'Ops Manager (Admin)' : 'Superviseur Planning',
      photoURL: undefined
    };
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white font-mono">CORTEX</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
                PLANNING
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Gestion des shifts & opérations 24/7</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Base de données Cloud Firestore synchronisée</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl mx-auto px-4 py-8 flex-1 flex items-center justify-center z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Value propositions & feature highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-700/50 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Plateforme Collaborative & API REST</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Planification des équipes, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                simplifiée & en temps réel.
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Connectez-vous pour accéder à la grille interactive des effectifs, aux roulements automatisés, au suivi de la couverture opérationnelle et aux exports API.
            </p>

            {/* Feature Pills */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Grille interactive Excel-like</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Colonnes figées, sélection multiple, recopie intelligente et raccourcis clavier.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Cloud Firestore Persistant</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Sauvegarde automatique et persistance des agents, shifts et plannings.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Extraction REST API & CSV</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Endpoints intégrés pour synchroniser vos systèmes SIRH et paie externes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 relative">
              
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white tracking-tight">Accès Sécurisé</h2>
                <p className="text-xs text-slate-400 mt-1">Identifiez-vous pour ouvrir votre espace de travail</p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-rose-200 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* 1. Google Sign-In (Primary / Recommended) */}
              <button
                id="login-with-google-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md shadow-white/5 transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continuer avec Google</span>
              </button>

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Ou par E-mail
                </span>
              </div>

              {/* Auth Mode Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
                <button
                  type="button"
                  id="tab-login-btn"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    authMode === 'login' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  id="tab-register-btn"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    authMode === 'register' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nouveau compte
                </button>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ops.manager@entreprise.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password-input"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-email-auth-btn"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'login' ? 'Se connecter' : 'Créer un compte'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-10 border-t border-slate-900">
        <p>© 2026 Richard Digonal. Tous droits réservés.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            Sécurisé par Firebase Firestore & Auth
          </span>
        </div>
      </footer>
    </div>
  );
};
