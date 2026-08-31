import React, { useState } from 'react';
import { Agent, AppUser, Shift } from '../types';
import { 
  ArrowLeftRight, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import { createSwapRequestInFirestore, updateUserAccessInFirestore } from '../firebase';

interface ShiftSwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
  selectedDates: string[];
  targetAgent: Agent | null;
  onSuccess?: () => void;
}

export const ShiftSwapRequestModal: React.FC<ShiftSwapRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  agents,
  shifts,
  planning,
  selectedDates,
  targetAgent,
  onSuccess
}) => {
  // Find current user's bound agent or allow selection
  const userBoundAgent = agents.find((a) => a.id === currentUser.agentId);
  const [selectedRequesterAgentId, setSelectedRequesterAgentId] = useState<string>(
    userBoundAgent?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const requesterAgent = agents.find((a) => a.id === selectedRequesterAgentId) || userBoundAgent;

  // Get shift description helper
  const getShiftInfo = (code?: string) => {
    if (!code) return { label: 'Repos / Non défini', hours: '-' };
    const s = shifts.find((sh) => sh.code.toUpperCase() === code.toUpperCase());
    return {
      label: s?.label || code,
      hours: s?.hours || 'Heures standard'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!requesterAgent) {
      setErrorMsg('Veuillez sélectionner votre profil agent pour envoyer la demande.');
      return;
    }

    if (!targetAgent) {
      setErrorMsg('Agent destinataire non sélectionné.');
      return;
    }

    if (requesterAgent.id === targetAgent.id) {
      setErrorMsg('Vous ne pouvez pas faire une demande d\'échange avec vous-même.');
      return;
    }

    if (selectedDates.length === 0) {
      setErrorMsg('Aucune date sélectionnée pour l\'échange.');
      return;
    }

    try {
      setIsSubmitting(true);

      // If user didn't have an agent bound yet, bind it now for future convenience
      if (!currentUser.agentId) {
        updateUserAccessInFirestore(currentUser.uid, {
          agentId: requesterAgent.id,
          agentName: requesterAgent.name
        }).catch(() => {});
      }

      // Collect snapshots of current shifts for these dates
      const requesterShifts: Record<string, string> = {};
      const targetShifts: Record<string, string> = {};

      selectedDates.forEach((d) => {
        requesterShifts[d] = planning[`${requesterAgent.id}_${d}`] || '';
        targetShifts[d] = planning[`${targetAgent.id}_${d}`] || '';
      });

      await createSwapRequestInFirestore({
        requesterUid: currentUser.uid,
        requesterEmail: currentUser.email,
        requesterName: currentUser.displayName || requesterAgent.name,
        requesterAgentId: requesterAgent.id,
        requesterAgentName: requesterAgent.name,
        targetAgentId: targetAgent.id,
        targetAgentName: targetAgent.name,
        dates: [...selectedDates].sort(),
        requesterShifts,
        targetShifts,
        status: 'pending_target',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit swap request:', err);
      setErrorMsg(err?.message || 'Erreur lors de l\'envoi de la demande d\'échange.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="shift-swap-request-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Demande d'échange de shifts
              </h3>
              <p className="text-xs text-slate-400">
                Transmettez votre proposition d'échange à votre collègue
              </p>
            </div>
          </div>
          <button
            id="close-swap-request-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Identification / Requester Agent Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Votre identité (Agent demandeur)
            </label>
            {userBoundAgent ? (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">{userBoundAgent.name}</div>
                  <div className="text-xs text-slate-400">Équipe : {userBoundAgent.team} · Station : {userBoundAgent.station}</div>
                </div>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[11px] font-mono-code rounded-full border border-blue-500/30">
                  Compte associé
                </span>
              </div>
            ) : (
              <select
                id="swap-requester-agent-select"
                value={selectedRequesterAgentId}
                onChange={(e) => setSelectedRequesterAgentId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">-- Sélectionnez votre profil agent --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.team} - {a.station})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target Agent info */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Agent destinataire de la demande
            </label>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">{targetAgent?.name || 'Non spécifié'}</div>
                <div className="text-xs text-slate-400">Équipe : {targetAgent?.team || 'N/A'} · Station : {targetAgent?.station || 'N/A'}</div>
              </div>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] font-mono-code rounded-full border border-indigo-500/30">
                Destinataire
              </span>
            </div>
          </div>

          {/* Selected Dates and Shift Comparison Table */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Dates et shifts concernés ({selectedDates.length} date(s))
            </label>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3 text-left font-medium">Date</th>
                    <th className="py-2 px-3 text-center font-medium text-blue-300">Votre shift actuel</th>
                    <th className="py-2 px-3 text-center font-medium text-indigo-300">Shift de {targetAgent?.name?.split(' ')[0] || 'Dest.'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedDates.map((dateStr) => {
                    const reqShift = requesterAgent ? planning[`${requesterAgent.id}_${dateStr}`] : '';
                    const targShift = targetAgent ? planning[`${targetAgent.id}_${dateStr}`] : '';
                    const reqInfo逗 = getShiftInfo(reqShift);
                    const targInfo = getShiftInfo(targShift);

                    return (
                      <tr key={dateStr} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-mono-code text-slate-300 font-medium">
                          {dateStr}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 bg-blue-950/60 border border-blue-500/40 text-blue-200 rounded font-bold font-mono-code">
                            {reqShift || 'Repos (RH)'}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{reqInfo逗.hours}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 rounded font-bold font-mono-code">
                            {targShift || 'Repos (RH)'}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{targInfo.hours}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow Explanation steps banner */}
          <div className="p-3.5 bg-slate-950/90 border border-blue-900/40 rounded-xl space-y-2 text-[11px] text-slate-400">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Circuit de validation automatique :
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>L'agent <strong>{targetAgent?.name}</strong> recevra une notification dans son compte pour accepter ou refuser l'échange.</li>
              <li>S'il accepte, la demande sera transmise aux <strong>Managers</strong> pour validation finale.</li>
              <li>Dès validation par la direction, le planning sera automatiquement mis à jour dans la base de données.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              id="cancel-swap-request-btn"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="submit-swap-request-btn"
              disabled={isSubmitting || !requesterAgent || !targetAgent}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer la demande d'échange</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
