import React from 'react';
import { ShiftSwapRequest, AppUser } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeftRight, 
  X, 
  Check 
} from 'lucide-react';
import { acknowledgeSwapNotification } from '../firebase';

interface ShiftSwapAdvisorToastsProps {
  requests: ShiftSwapRequest[];
  currentUser: AppUser;
}

export const ShiftSwapAdvisorToasts: React.FC<ShiftSwapAdvisorToastsProps> = ({
  requests,
  currentUser
}) => {
  // Filter notifications where the current user is the requester and status has been updated and not yet acknowledged
  const relevantAdvisedRequests = requests.filter((req) => {
    const isRequester = 
      req.requesterUid === currentUser.uid || 
      (currentUser.agentId && req.requesterAgentId === currentUser.agentId) ||
      (currentUser.email && req.requesterEmail.toLowerCase() === currentUser.email.toLowerCase());

    if (!isRequester) return false;
    if (req.requesterNotified) return false;

    // We notify on final decisions or active status changes
    return ['rejected_by_target', 'rejected_by_manager', 'approved'].includes(req.status);
  });

  if (relevantAdvisedRequests.length === 0) return null;

  return (
    <div className="fixed bottom-14 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {relevantAdvisedRequests.map((req) => {
        const isApproved = req.status === 'approved';
        const isTargetRejected = req.status === 'rejected_by_target';
        const isManagerRejected = req.status === 'rejected_by_manager';

        let borderColor = 'border-slate-700';
        let bgColor = 'bg-slate-900/95';
        let title = "Mise à jour d'échange";
        let message = '';

        if (isApproved) {
          borderColor = 'border-emerald-500/70';
          title = "Échange de shifts validé ! 🎉";
          message = `Votre échange avec ${req.targetAgentName} pour le(s) ${req.dates.join(', ')} a été validé par la direction et appliqué au planning.`;
        } else if (isTargetRejected) {
          borderColor = 'border-rose-500/70';
          title = "Demande d'échange refusée";
          message = `L'agent ${req.targetAgentName} a refusé votre demande d'échange pour le(s) ${req.dates.join(', ')}.`;
        } else if (isManagerRejected) {
          borderColor = 'border-amber-500/70';
          title = "Échange refusé par le manager";
          message = `Votre échange avec ${req.targetAgentName} pour le(s) ${req.dates.join(', ')} a été refusé par la direction.`;
        }

        return (
          <div
            key={req.id}
            id={`swap-advised-toast-${req.id}`}
            className={`
              pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${bgColor} ${borderColor}
            `}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {isApproved && <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />}
                {isTargetRejected && <XCircle className="w-5 h-5 text-rose-400" />}
                {isManagerRejected && <XCircle className="w-5 h-5 text-amber-400" />}
              </div>

              <div className="flex-1 min-w-0 text-xs">
                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                <p className="text-slate-300 leading-relaxed">{message}</p>
                
                <div className="mt-3 flex items-center justify-end">
                  <button
                    id={`ack-swap-${req.id}-btn`}
                    onClick={() => acknowledgeSwapNotification(req.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>J'ai compris / Fermer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
