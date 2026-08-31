import React, { useState } from 'react';
import { ShiftSwapRequest, AppUser, Agent, Shift } from '../types';
import { 
  ArrowLeftRight, 
  Check, 
  X, 
  ShieldCheck, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { respondToSwapRequestAsManager } from '../firebase';

interface ShiftSwapManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingManagerRequests: ShiftSwapRequest[];
  currentUser: AppUser;
  planning: Record<string, string>;
  onSwapApproved?: (newPlanning: Record<string, string>) => void;
}

export const ShiftSwapManagerModal: React.FC<ShiftSwapManagerModalProps> = ({
  isOpen,
  onClose,
  pendingManagerRequests,
  currentUser,
  planning,
  onSwapApproved
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleDecision = async (requestId: string, approved: boolean) => {
    try {
      setProcessingId(requestId);
      const result = await respondToSwapRequestAsManager(requestId, approved, currentUser, planning);

      if (approved && result.updatedPlanning) {
        if (onSwapApproved) {
          onSwapApproved(result.updatedPlanning);
        }
        setNotification({
          message: 'Échange validé avec succès ! Le planning a été mis à jour automatiquement.',
          type: 'success'
        });
      } else {
        setNotification({
          message: 'Demande d\'échange refusée. L\'agent demandeur a été notifié.',
          type: 'error'
        });
      }

      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Manager swap decision error:', err);
      setNotification({
        message: err?.message || 'Erreur lors de la prise de décision.',
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="shift-swap-manager-modal"
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Validation des échanges de shifts (Manager)
              </h3>
              <p className="text-xs text-slate-400">
                Demandes d'échange acceptées par les deux agents, en attente d'approbation managériale
              </p>
            </div>
          </div>
          <button
            id="close-swap-manager-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Notification */}
        {notification && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-950 text-emerald-200 border-b border-emerald-800' : 'bg-rose-950 text-rose-200 border-b border-rose-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm text-slate-200">
          {pendingManagerRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
              </div>
              <h4 className="font-bold text-white text-sm">Aucune demande en attente</h4>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                Toutes les demandes d'échange d'horaires ont été traitées.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingManagerRequests.map((req) => (
                <div
                  key={req.id}
                  id={`manager-swap-card-${req.id}`}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono-code font-bold text-[11px] rounded-md border border-indigo-500/30">
                        Accord agents trouvé
                      </span>
                      <span className="text-xs text-slate-400">
                        Accepté par {req.targetAgentName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono-code">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Agents comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Demandeur</span>
                      <div className="font-semibold text-white text-sm">{req.requesterAgentName}</div>
                      <div className="text-xs text-slate-400">{req.requesterEmail}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Destinataire (Accord donné)</span>
                      <div className="font-semibold text-white text-sm">{req.targetAgentName}</div>
                      <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Accord confirmé
                      </div>
                    </div>
                  </div>

                  {/* Shifts & Dates Table */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <th className="py-1.5 px-3 text-left font-medium">Date</th>
                          <th className="py-1.5 px-3 text-center font-medium text-blue-300">Shift actuel {req.requesterAgentName.split(' ')[0]}</th>
                          <th className="py-1.5 px-3 text-center font-medium text-indigo-300">Shift actuel {req.targetAgentName.split(' ')[0]}</th>
                          <th className="py-1.5 px-3 text-center font-medium text-emerald-400">Nouvelle affectation après validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {req.dates.map((d) => (
                          <tr key={d}>
                            <td className="py-1.5 px-3 font-mono-code text-slate-300 font-medium">{d}</td>
                            <td className="py-1.5 px-3 text-center font-mono-code font-bold text-blue-300">
                              {req.requesterShifts?.[d] || 'RH'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono-code font-bold text-indigo-300">
                              {req.targetShifts?.[d] || 'RH'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono-code text-[11px] text-emerald-300">
                              {req.requesterAgentName.split(' ')[0]} → <strong>{req.targetShifts?.[d] || 'RH'}</strong> · {req.targetAgentName.split(' ')[0]} → <strong>{req.requesterShifts?.[d] || 'RH'}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      id={`manager-reject-swap-${req.id}-btn`}
                      onClick={() => handleDecision(req.id, false)}
                      disabled={processingId === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Refuser la demande</span>
                    </button>
                    <button
                      id={`manager-approve-swap-${req.id}-btn`}
                      onClick={() => handleDecision(req.id, true)}
                      disabled={processingId === req.id}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-colors disabled:opacity-50"
                    >
                      {processingId === req.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Valider l'échange (Mise à jour BDD)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>L'approbation applique instantanément l'échange sur le planning partagé.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
