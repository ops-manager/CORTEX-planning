import React, { useState } from 'react';
import { AppUser } from '../types';
import { 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Send, 
  Mail, 
  Calendar,
  Lock,
  Sparkles
} from 'lucide-react';
import { updateUserAccessInFirestore } from '../firebase';

interface PendingApprovalViewProps {
  currentUser: AppUser;
  onLogout: () => void;
  onRefresh: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  currentUser,
  onLogout,
  onRefresh
}) => {
  const [requestNote, setRequestNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [noteSentSuccess, setNoteSentSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRejected = currentUser.status === 'rejected' || currentUser.status === 'disabled';

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestNote.trim()) return;

    try {
      setIsSendingNote(true);
      await updateUserAccessInFirestore(currentUser.uid, {
        requestReason: requestNote.trim()
      });
      setNoteSentSuccess(true);
      setRequestNote('');
    } catch (err) {
      console.error('Failed to send request note:', err);
    } finally {
      setIsSendingNote(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between z-10">
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
            <p className="text-[11px] text-slate-400">Système d'Accès & Permissions</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Se déconnecter</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-lg mx-auto px-4 py-8 flex-1 flex items-center justify-center z-10">
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 text-center relative">
          
          {/* Status Icon */}
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border">
            {isRejected ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border-rose-500/30 flex items-center justify-center text-rose-400 shadow-rose-500/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-amber-500/20 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Title & Description */}
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isRejected ? 'Accès non autorisé' : 'Demande d\'accès en attente d\'approbation'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            {isRejected
              ? "Votre compte n'a pas été autorisé à accéder à la base de données de planification CORTEX. Contactez l'administrateur système si vous pensez qu'il s'agit d'une erreur."
              : "Votre compte a bien été créé. Le système de contrôle d'accès requiert la validation d'un administrateur ou l'évaluation des règles d'auto-approbation pour ouvrir votre espace."}
          </p>

          {/* User Information Box */}
          <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Compte connecté :</span>
              <span className="font-semibold text-slate-200">{currentUser.displayName}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Adresse e-mail :</span>
              <span className="font-mono text-blue-400">{currentUser.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Statut actuel :</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isRejected 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isRejected ? 'Accès Refusé' : 'En Attente de Validation'}
              </span>
            </div>
          </div>

          {/* Real-time Notification Banner */}
          {!isRejected && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-center justify-center gap-2 text-xs text-blue-300 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Synchronisation en temps réel avec Firestore active</span>
            </div>
          )}

          {/* Justification / Note Form (Optional) */}
          {!isRejected && (
            <div className="mb-5 text-left">
              {noteSentSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Votre message a été transmis à l'administrateur.</span>
                </div>
              ) : (
                <form onSubmit={handleSendNote} className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Motif ou message pour l'administrateur (optionnel)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      placeholder="Ex: Planificateur Équipe Paris, poste Orly..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingNote || !requestNote.trim()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Vérifier le statut</span>
            </button>
            <button
              onClick={onLogout}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors border border-slate-700"
            >
              Déconnexion
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-center text-xs text-slate-500 z-10 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Contrôle d'accès basé sur les rôles (RBAC) & Auto-Approbation Firestore</span>
        </div>
      </footer>
    </div>
  );
};
