import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { X, User, Building2, MapPin, Check, AlertCircle } from 'lucide-react';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentData: Agent) => Promise<void>;
  initialAgent?: Agent | null;
  existingAgents: Agent[];
  defaultTeam?: string;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAgent,
  existingAgents,
  defaultTeam
}) => {
  const isEditing = Boolean(initialAgent);

  const [name, setName] = useState('');
  const [team, setTeam] = useState('Paris');
  const [customTeam, setCustomTeam] = useState('');
  const [isNewTeam, setIsNewTeam] = useState(false);
  const [station, setStation] = useState('PAR');
  const [order, setOrder] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract existing teams & stations
  const existingTeams = React.useMemo(() => {
    const set = new Set<string>();
    existingAgents.forEach(a => {
      if (a.team) set.add(a.team);
    });
    return Array.from(set);
  }, [existingAgents]);

  const existingStations = React.useMemo(() => {
    const set = new Set<string>();
    existingAgents.forEach(a => {
      if (a.station) set.add(a.station);
    });
    return Array.from(set);
  }, [existingAgents]);

  useEffect(() => {
    if (initialAgent) {
      setName(initialAgent.name || '');
      setTeam(initialAgent.team || 'Paris');
      setStation(initialAgent.station || 'PAR');
      setOrder(initialAgent.order ?? existingAgents.length);
      setIsNewTeam(false);
      setCustomTeam('');
    } else {
      setName('');
      setTeam(defaultTeam || (existingTeams[0] || 'Paris'));
      setStation(existingStations[0] || 'PAR');
      setOrder(existingAgents.length);
      setIsNewTeam(false);
      setCustomTeam('');
    }
    setError(null);
  }, [initialAgent, isOpen, defaultTeam, existingAgents.length, existingTeams, existingStations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanTeam = (isNewTeam ? customTeam : team).trim();
    const cleanStation = station.trim().toUpperCase();

    if (!cleanName) {
      setError("Le nom de l'agent est requis.");
      return;
    }

    if (!cleanTeam) {
      setError("L'équipe est requise.");
      return;
    }

    if (!cleanStation) {
      setError("Le code station est requis (ex: CDG, NCE, PAR, ABN).");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const agentData: Agent = {
        id: initialAgent?.id || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        team: cleanTeam,
        station: cleanStation,
        order: Number(order) || 0,
        defaultMissionId: initialAgent?.defaultMissionId || '',
        ownerId: initialAgent?.ownerId || 'nJxGjmZvHxZNnaIV5BXiRjiq0Cv2'
      };

      await onSave(agentData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement de l'agent.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="agent-modal-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {isEditing ? `Modifier l'agent ${initialAgent?.name}` : 'Ajouter un nouvel agent'}
              </h3>
              <p className="text-xs text-slate-400">
                Fiche effectif, équipe et affectation station
              </p>
            </div>
          </div>
          <button
            id="close-agent-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 text-rose-300 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nom complet de l'agent <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                id="agent-name-input"
                type="text"
                required
                placeholder="ex: Lucas Martin, Sarah B..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Équipe d'appartenance <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewTeam(!isNewTeam)}
                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
              >
                {isNewTeam ? 'Choisir équipe existante' : '+ Nouvelle équipe'}
              </button>
            </div>

            {isNewTeam ? (
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  id="agent-custom-team-input"
                  type="text"
                  required
                  placeholder="ex: Marseille, Lyon, Nuit..."
                  value={customTeam}
                  onChange={(e) => setCustomTeam(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <select
                  id="agent-team-select"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {existingTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Station & Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Code Station <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  id="agent-station-input"
                  type="text"
                  required
                  placeholder="ex: PAR, CDG..."
                  value={station}
                  onChange={(e) => setStation(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ordre d'affichage
              </label>
              <input
                id="agent-order-input"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="cancel-agent-btn"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="save-agent-btn"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : "Créer l'agent"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
