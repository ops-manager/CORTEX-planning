import React, { useState } from 'react';
import { ShiftSwapRequest, AppUser, Agent, Shift } from '../types';
import { 
  ArrowLeftRight, 
  Check, 
  X, 
  Calendar, 
  AlertCircle, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { respondToSwapRequestAsTarget } from '../firebase';

interface ShiftSwapTargetPromptProps {
  pendingRequests: ShiftSwapRequest[];
  currentUser: AppUser;
  shifts: Shift[];
  onActionComplete?: () => void;
}

export const ShiftSwapTargetPrompt: React.FC<ShiftSwapTargetPromptProps> = ({
  pendingRequests,
  currentUser,
  shifts,
  onActionComplete
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (pendingRequests.length === 0) return null;

  // Current active request being reviewed (first one)
  const currentReq = pendingRequests[0];

  const handleDecision = async (accepted: boolean) => {
    try {
      setIsProcessing(currentReq.id);
      await respondToSwapRequestAsTarget(currentReq.id, accepted, currentUser);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error('Error responding to swap request:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <aside 
      id="shift-swap-target-docked-banner"
      aria-label="Demande d'échange de planning en attente"
      className="w-full bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-b-2 border-amber-500/70 shadow-xl z-30 transition-all backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        
        {/* Left: Prominent User Message mandated by user */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl flex-shrink-0 mt-0.5 animate-pulse">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold font-mono-code text-[10px] rounded-sm uppercase tracking-wide">
                Demande d'échange
              </span>
              <span className="text-amber-200 font-semibold">
                L'agent <strong className="text-white underline decoration-amber-400 decoration-2 font-bold">{currentReq.requesterAgentName}</strong> souhaite faire un échange des dates surlignées avec vous.
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              Merci de dire si vous acceptez ou si vous refusez. Les dates correspondantes sont surlignées en ambre sur le planning ci-dessous.
            </p>

            {/* Quick dates preview badges */}
            {!isMinimized && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Dates concernées :</span>
                {currentReq.dates.map((d) => (
                  <span
                    key={d}
                    className="px-1.5 py-0.5 bg-slate-950/80 border border-amber-500/50 text-amber-300 rounded font-mono-code font-bold text-[10px]"
                  >
                    {d} (Vous : {currentReq.targetShifts?.[d] || 'RH'} ↔ {currentReq.requesterShifts?.[d] || 'RH'})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
          <button
            id="refuse-swap-request-btn"
            onClick={() => handleDecision(false)}
            disabled={isProcessing === currentReq.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-600/60 rounded-xl font-semibold transition-all text-xs disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Refuser</span>
          </button>

          <button
            id="accept-swap-request-btn"
            onClick={() => handleDecision(true)}
            disabled={isProcessing === currentReq.id}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-xs disabled:opacity-50"
          >
            {isProcessing === currentReq.id ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Accepter l'échange</span>
          </button>

          {pendingRequests.length > 1 && (
            <span className="text-[10px] text-amber-400 font-mono-code ml-1 bg-amber-950/80 px-2 py-1 rounded border border-amber-700/50">
              +{pendingRequests.length - 1} autre(s)
            </span>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title={isMinimized ? 'Afficher les détails' : 'Réduire'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </aside>
  );
};
