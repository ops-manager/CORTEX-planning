import React, { useState } from 'react';
import { ShiftSwapRequest, AppUser, Agent } from '../types';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  X, 
  Search, 
  Filter, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { deleteSwapRequestInFirestore } from '../firebase';

interface ShiftSwapHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ShiftSwapRequest[];
  currentUser: AppUser;
  agents: Agent[];
  isAdminOrManager: boolean;
}

export const ShiftSwapHistoryModal: React.FC<ShiftSwapHistoryModalProps> = ({
  isOpen,
  onClose,
  requests,
  currentUser,
  agents,
  isAdminOrManager
}) => {
  const [filter, setFilter] = useState<'all' | 'my_sent' | 'my_received' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const getStatusBadge = (status: ShiftSwapRequest['status']) => {
    switch (status) {
      case 'pending_target':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> En attente de l'agent
          </span>
        );
      case 'pending_manager':
        return (
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[11px] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" /> En attente du manager
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Validé & Appliqué
          </span>
        );
      case 'rejected_by_target':
        return (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-[11px] font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" /> Refusé par l'agent
          </span>
        );
      case 'rejected_by_manager':
        return (
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-md text-[11px] font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3 text-orange-400" /> Refusé par le manager
          </span>
        );
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter((req) => {
    // Role filter
    const isSentByMe = 
      req.requesterUid === currentUser.uid || 
      (currentUser.agentId && req.requesterAgentId === currentUser.agentId);
    
    const isReceivedByMe = 
      (currentUser.agentId && req.targetAgentId === currentUser.agentId) ||
      (currentUser.email && req.targetEmail?.toLowerCase() === currentUser.email.toLowerCase());

    if (!isAdminOrManager) {
      if (!isSentByMe && !isReceivedByMe) return false;
    }

    if (filter === 'my_sent' && !isSentByMe) return false;
    if (filter === 'my_received' && !isReceivedByMe) return false;
    if (filter === 'pending' && !['pending_target', 'pending_manager'].includes(req.status)) return false;
    if (filter === 'approved' && req.status !== 'approved') return false;
    if (filter === 'rejected' && !['rejected_by_target', 'rejected_by_manager'].includes(req.status)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = req.requesterAgentName.toLowerCase().includes(q) || req.targetAgentName.toLowerCase().includes(q);
      const matchDates = req.dates.some((d) => d.includes(q));
      if (!matchName && !matchDates) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="shift-swap-history-modal"
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Historique des demandes d'échange
              </h3>
              <p className="text-xs text-slate-400">
                Consultez le statut et le suivi en temps réel de vos demandes d'échange de shifts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Tous ({requests.length})
            </button>
            <button
              onClick={() => setFilter('my_sent')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'my_sent' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Mes demandes envoyées
            </button>
            <button
              onClick={() => setFilter('my_received')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'my_received' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Demandes reçues
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Validés
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'rejected' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Refusés
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher agent ou date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 text-xs text-slate-200">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">Aucune demande trouvée</p>
              <p className="text-xs text-slate-500">Sélectionnez des cases sur la ligne d'un collègue et cliquez sur "Demande échange" pour démarrer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{req.requesterAgentName}</span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                        <span>{req.targetAgentName}</span>
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-mono-code text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isAdminOrManager && (
                        <button
                          onClick={() => deleteSwapRequestInFirestore(req.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Supprimer la trace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dates and shifts preview */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-medium">Dates :</span>
                    {req.dates.map((d) => (
                      <span key={d} className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded font-mono-code text-[11px]">
                        {d} ({req.requesterShifts?.[d] || 'RH'} ↔ {req.targetShifts?.[d] || 'RH'})
                      </span>
                    ))}
                  </div>

                  {/* Audit details */}
                  {(req.targetDecisionAt || req.managerDecisionAt) && (
                    <div className="pt-2 border-t border-slate-850 flex items-center gap-4 text-[10px] text-slate-400">
                      {req.targetDecisionAt && (
                        <div>
                          Réponse agent : <span className="text-slate-300">{req.targetDecisionBy || req.targetAgentName}</span> ({new Date(req.targetDecisionAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                        </div>
                      )}
                      {req.managerDecisionAt && (
                        <div>
                          Décision manager : <span className="text-slate-300">{req.managerName || 'Direction'}</span> ({new Date(req.managerDecisionAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
