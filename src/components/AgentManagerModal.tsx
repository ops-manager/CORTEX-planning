import React, { useState } from 'react';
import { Agent } from '../types';
import { AgentModal } from './AgentModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Building2, 
  MapPin, 
  AlertTriangle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';

interface AgentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onCreateAgent: (agent: Agent) => Promise<void>;
  onUpdateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
  onReorderAgents: (newAgents: Agent[]) => void;
}

export const AgentManagerModal: React.FC<AgentManagerModalProps> = ({
  isOpen,
  onClose,
  agents,
  onCreateAgent,
  onUpdateAgent,
  onDeleteAgent,
  onReorderAgents
}) => {
  const [search, setSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');

  // Sub-modal states
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [preselectedTeam, setPreselectedTeam] = useState<string | undefined>(undefined);

  // Delete confirmation dialog state
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag & drop reorder states
  const [draggedModalAgentId, setDraggedModalAgentId] = useState<string | null>(null);
  const [dropTargetModalAgentId, setDropTargetModalAgentId] = useState<string | null>(null);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  const showReorderFeedback = (msg = "Ordre sauvegardé dans la base de données Firestore") => {
    setReorderSuccessMsg(msg);
    setTimeout(() => setReorderSuccessMsg(null), 3000);
  };

  // Group teams
  const teams = React.useMemo(() => {
    const teamMap: Record<string, Agent[]> = {};
    const teamNames: string[] = [];

    agents.forEach(agent => {
      const t = agent.team || 'Sans Équipe';
      if (!teamMap[t]) {
        teamMap[t] = [];
        teamNames.push(t);
      }
      teamMap[t].push(agent);
    });

    teamNames.forEach(t => {
      teamMap[t].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return { teamMap, teamNames };
  }, [agents]);

  // Reorder and persist helper
  const reorderAndPersist = (teamMap: Record<string, Agent[]>, teamNames: string[]) => {
    const newAgentsList: Agent[] = [];
    let globalOrder = 0;
    teamNames.forEach(tName => {
      const list = teamMap[tName] || [];
      list.forEach(ag => {
        newAgentsList.push({
          ...ag,
          team: tName,
          order: globalOrder++
        });
      });
    });
    onReorderAgents(newAgentsList);
    showReorderFeedback();
  };

  const handleMoveAgent = (agentId: string, teamName: string, direction: 'up' | 'down') => {
    const currentList = [...(teams.teamMap[teamName] || [])];
    const idx = currentList.findIndex(a => a.id === agentId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const [moved] = currentList.splice(idx, 1);
    currentList.splice(targetIdx, 0, moved);

    const updatedMap = {
      ...teams.teamMap,
      [teamName]: currentList
    };
    reorderAndPersist(updatedMap, teams.teamNames);
  };

  const handleMoveTeam = (teamName: string, direction: 'up' | 'down') => {
    const names = [...teams.teamNames];
    const idx = names.indexOf(teamName);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= names.length) return;

    const [moved] = names.splice(idx, 1);
    names.splice(targetIdx, 0, moved);

    reorderAndPersist(teams.teamMap, names);
  };

  const handleModalAgentDrop = (targetAgentId: string) => {
    if (!draggedModalAgentId || draggedModalAgentId === targetAgentId) {
      setDraggedModalAgentId(null);
      setDropTargetModalAgentId(null);
      return;
    }

    const src = agents.find(a => a.id === draggedModalAgentId);
    const tgt = agents.find(a => a.id === targetAgentId);
    if (!src || !tgt) {
      setDraggedModalAgentId(null);
      setDropTargetModalAgentId(null);
      return;
    }

    const updatedMap: Record<string, Agent[]> = {};
    teams.teamNames.forEach(t => {
      updatedMap[t] = [...(teams.teamMap[t] || [])];
    });

    const srcList = updatedMap[src.team] || [];
    const srcIdx = srcList.findIndex(a => a.id === src.id);
    if (srcIdx !== -1) srcList.splice(srcIdx, 1);

    const updatedAgent = { ...src, team: tgt.team };
    const tgtList = updatedMap[tgt.team] || [];
    const tgtIdx = tgtList.findIndex(a => a.id === tgt.id);
    if (tgtIdx !== -1) {
      tgtList.splice(tgtIdx, 0, updatedAgent);
    } else {
      tgtList.push(updatedAgent);
    }

    reorderAndPersist(updatedMap, teams.teamNames);
    setDraggedModalAgentId(null);
    setDropTargetModalAgentId(null);
  };

  // Filtered agents
  const filteredAgents = React.useMemo(() => {
    return agents.filter(a => {
      const matchesSearch = 
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.station.toLowerCase().includes(search.toLowerCase()) ||
        a.team.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = selectedTeamFilter === 'ALL' || a.team === selectedTeamFilter;
      return matchesSearch && matchesTeam;
    });
  }, [agents, search, selectedTeamFilter]);

  if (!isOpen) return null;

  const handleOpenCreate = (teamName?: string) => {
    setEditingAgent(null);
    setPreselectedTeam(teamName);
    setIsAgentModalOpen(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsAgentModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteAgent(agentToDelete.id);
      setAgentToDelete(null);
    } catch (err) {
      console.error('Failed to delete agent:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="agent-manager-modal"
        className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Gestion des Effectifs & Équipes
                </h2>
                <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-mono-code font-bold">
                  {agents.length} agents
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Créer, modifier, organiser et supprimer les agents opérationnels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {reorderSuccessMsg && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>{reorderSuccessMsg}</span>
              </div>
            )}
            <button
              id="add-agent-btn-manager"
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvel Agent</span>
            </button>
            <button
              id="close-agent-manager-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter & Search */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              id="agent-manager-search"
              type="text"
              placeholder="Rechercher par nom, station, équipe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Team Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => setSelectedTeamFilter('ALL')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                ${selectedTeamFilter === 'ALL' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}
              `}
            >
              Toutes ({agents.length})
            </button>
            {teams.teamNames.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTeamFilter(t)}
                className={`
                  px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                  ${selectedTeamFilter === t 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}
                `}
              >
                {t} ({teams.teamMap[t]?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Agents List Body */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-800/60">
          {teams.teamNames.map(teamName => {
            const teamAgents = (teams.teamMap[teamName] || []).filter(a => {
              const matchesSearch = 
                a.name.toLowerCase().includes(search.toLowerCase()) ||
                a.station.toLowerCase().includes(search.toLowerCase()) ||
                a.team.toLowerCase().includes(search.toLowerCase());
              const matchesTeam = selectedTeamFilter === 'ALL' || a.team === selectedTeamFilter;
              return matchesSearch && matchesTeam;
            });

            if (teamAgents.length === 0) return null;

            return (
              <div key={teamName} className="py-4 first:pt-0 last:pb-0">
                {/* Team Section Banner */}
                <div className="flex items-center justify-between mb-2.5 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleMoveTeam(teamName, 'up')}
                        disabled={teams.teamNames.indexOf(teamName) === 0}
                        title="Monter l'équipe"
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveTeam(teamName, 'down')}
                        disabled={teams.teamNames.indexOf(teamName) === teams.teamNames.length - 1}
                        title="Descendre l'équipe"
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Building2 className="w-4 h-4 text-blue-400 ml-1" />
                    <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      Équipe {teamName}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400 font-mono-code">
                      {teamAgents.length} agents
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenCreate(teamName)}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Ajouter à {teamName}</span>
                  </button>
                </div>

                {/* Agents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {teamAgents.map((agent, agentIdx) => (
                    <div
                      key={agent.id}
                      id={`agent-card-${agent.id}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedModalAgentId && draggedModalAgentId !== agent.id) {
                          setDropTargetModalAgentId(agent.id);
                        }
                      }}
                      onDrop={() => handleModalAgentDrop(agent.id)}
                      className={`
                        group p-2.5 bg-slate-950/60 hover:bg-slate-850 border rounded-lg flex items-center justify-between gap-2 transition-all shadow-sm
                        ${dropTargetModalAgentId === agent.id ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500' : 'border-slate-800/80 hover:border-slate-700'}
                      `}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Drag Handle */}
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', `agent:${agent.id}`);
                            setDraggedModalAgentId(agent.id);
                          }}
                          onDragEnd={() => {
                            setDraggedModalAgentId(null);
                            setDropTargetModalAgentId(null);
                          }}
                          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 flex-shrink-0 p-0.5 rounded hover:bg-slate-800"
                          title="Glisser pour réorganiser"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-slate-100 block truncate">
                            {agent.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-blue-300 font-mono-code border border-slate-700">
                              {agent.station}
                            </span>
                            <span className="text-slate-500 font-mono-code">
                              #{agent.order != null ? agent.order + 1 : agentIdx + 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons with reorder arrows */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          disabled={agentIdx === 0}
                          onClick={() => handleMoveAgent(agent.id, teamName, 'up')}
                          title="Monter l'agent"
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={agentIdx === teamAgents.length - 1}
                          onClick={() => handleMoveAgent(agent.id, teamName, 'down')}
                          title="Descendre l'agent"
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`edit-agent-${agent.id}-btn`}
                          onClick={() => handleOpenEdit(agent)}
                          title="Modifier l'agent"
                          className="p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors ml-0.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-agent-${agent.id}-btn`}
                          onClick={() => setAgentToDelete(agent)}
                          title="Supprimer l'agent"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredAgents.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              Aucun agent ne correspond à votre recherche.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{agents.length} agents au total dans la base de données Firestore</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isAgentModalOpen && (
        <AgentModal
          isOpen={isAgentModalOpen}
          onClose={() => setIsAgentModalOpen(false)}
          onSave={async (data) => {
            if (editingAgent) {
              await onUpdateAgent(editingAgent.id, data);
            } else {
              await onCreateAgent(data);
            }
          }}
          initialAgent={editingAgent}
          existingAgents={agents}
          defaultTeam={preselectedTeam}
        />
      )}

      {/* Delete Confirmation Modal */}
      {agentToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-100">Supprimer l'agent ?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement l'agent{' '}
              <strong className="text-white">{agentToDelete.name}</strong> (Station: {agentToDelete.station}, Équipe: {agentToDelete.team}) ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAgentToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
