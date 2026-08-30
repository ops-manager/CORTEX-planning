import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Calendar, 
  Download, 
  Code2, 
  RefreshCw, 
  Users, 
  Sparkles,
  Terminal,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Agent, Shift, ApiToken } from '../types';
import { formatToDateStr, formatFullFrenchDate, parseDateStr } from '../utils/dateUtils';
import { API_IMPORTED_SHIFTS } from '../data/mockData';
import { ApiTokenManager } from './ApiTokenManager';
import { getApiTokensFromFirestore, DEFAULT_MASTER_API_TOKEN } from '../firebase';

interface DateShiftExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
}

export const DateShiftExtractorModal: React.FC<DateShiftExtractorModalProps> = ({
  isOpen,
  onClose,
  selectedDate: initialDate,
  agents,
  shifts,
  planning
}) => {
  const [modalTab, setModalTab] = useState<'extractor' | 'tokens'>('extractor');
  const [targetDateStr, setTargetDateStr] = useState<string>(() => formatToDateStr(initialDate));
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'compact' | 'csv' | 'table'>('table');
  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [liveApiLoading, setLiveApiLoading] = useState<boolean>(false);
  const [liveApiResponse, setLiveApiResponse] = useState<any | null>(null);
  const [liveApiStatus, setLiveApiStatus] = useState<number | null>(null);
  
  // Active API Token selected for code snippets & live testing
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([DEFAULT_MASTER_API_TOKEN]);
  const [selectedToken, setSelectedToken] = useState<ApiToken>(DEFAULT_MASTER_API_TOKEN);

  // Sync initial date and load tokens
  useEffect(() => {
    if (isOpen) {
      setTargetDateStr(formatToDateStr(initialDate));
      setLiveApiResponse(null);
      setLiveApiStatus(null);
      getApiTokensFromFirestore().then(tokens => {
        if (tokens && tokens.length > 0) {
          setApiTokens(tokens);
          setSelectedToken(tokens.find(t => t.isActive) || tokens[0]);
        }
      }).catch(() => {});
    }
  }, [isOpen, initialDate]);

  const targetDateObj = useMemo(() => {
    try {
      return parseDateStr(targetDateStr);
    } catch {
      return new Date();
    }
  }, [targetDateStr]);

  const fullDateLabel = useMemo(() => {
    return formatFullFrenchDate(targetDateObj);
  }, [targetDateObj]);

  // Unique teams
  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    agents.forEach(a => {
      if (a.team) teams.add(a.team);
    });
    return Array.from(teams);
  }, [agents]);

  // Shift lookup dictionary
  const shiftDict = useMemo(() => {
    const map = new Map<string, Shift>();
    API_IMPORTED_SHIFTS.forEach(s => map.set(s.code.toLowerCase(), s));
    shifts.forEach(s => {
      if (s.code) map.set(s.code.toLowerCase(), s);
    });
    return map;
  }, [shifts]);

  // Filtered list of agents
  const filteredAgents = useMemo(() => {
    if (selectedTeam === 'all') return agents;
    return agents.filter(a => a.team?.toLowerCase() === selectedTeam.toLowerCase());
  }, [agents, selectedTeam]);

  // Assignments for target date
  const assignmentsData = useMemo(() => {
    let totalAssigned = 0;
    let totalWorking = 0;
    let totalOff = 0;
    const counts: Record<string, number> = {};
    const compact: Record<string, string> = {};

    const list = filteredAgents.map(agent => {
      const key = `${agent.id}_${targetDateStr}`;
      const shiftCode = planning[key] || "";

      if (shiftCode) {
        totalAssigned++;
        counts[shiftCode] = (counts[shiftCode] || 0) + 1;
        compact[agent.name] = shiftCode;
      } else {
        compact[agent.name] = "";
      }

      const shiftMeta = shiftDict.get(shiftCode.toLowerCase());
      const isOff = ["OFF", "RH", "CA", "CP", "RC", "R", "ABS", "MAL"].includes(shiftCode.toUpperCase()) ||
        (shiftMeta?.hours === "00:00 - 00:00");

      if (shiftCode) {
        if (isOff) totalOff++;
        else totalWorking++;
      }

      let startTime = "";
      let endTime = "";
      if (shiftMeta?.hours && shiftMeta.hours.includes("-")) {
        const parts = shiftMeta.hours.split("-").map(p => p.trim());
        startTime = parts[0] || "";
        endTime = parts[1] || "";
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        station: agent.station || "",
        team: agent.team || "",
        shiftCode: shiftCode,
        shiftLabel: shiftMeta?.label || (shiftCode ? shiftCode : "Non assigné"),
        hours: shiftMeta?.hours || (isOff ? "00:00 - 00:00" : ""),
        startTime,
        endTime,
        defaultPause: shiftMeta?.defaultPause || "",
        isOff
      };
    });

    return {
      date: targetDateStr,
      dayName: fullDateLabel.split(' ')[0],
      totalAgents: filteredAgents.length,
      totalAssigned,
      totalWorking,
      totalOff,
      counts,
      compact,
      list
    };
  }, [filteredAgents, targetDateStr, planning, shiftDict, fullDateLabel]);

  // Full JSON export string
  const jsonExportString = useMemo(() => {
    const payload = {
      date: assignmentsData.date,
      dayName: assignmentsData.dayName,
      totalAgents: assignmentsData.totalAgents,
      totalAssigned: assignmentsData.totalAssigned,
      totalWorking: assignmentsData.totalWorking,
      totalOff: assignmentsData.totalOff,
      shiftCounts: assignmentsData.counts,
      assignments: assignmentsData.list.map(a => ({
        agentId: a.agentId,
        agentName: a.agentName,
        station: a.station,
        team: a.team,
        shiftCode: a.shiftCode,
        shiftLabel: a.shiftLabel,
        hours: a.hours,
        startTime: a.startTime,
        endTime: a.endTime,
        defaultPause: a.defaultPause,
        isOff: a.isOff
      }))
    };
    return JSON.stringify(payload, null, 2);
  }, [assignmentsData]);

  // Compact JSON export string
  const compactJsonString = useMemo(() => {
    return JSON.stringify({
      date: assignmentsData.date,
      dayName: assignmentsData.dayName,
      assignments: assignmentsData.compact
    }, null, 2);
  }, [assignmentsData]);

  // CSV export string
  const csvExportString = useMemo(() => {
    const header = "ID Agent;Nom Agent;Equipe;Station;Date;Code Shift;Horaires;Pause;Statut\n";
    const rows = assignmentsData.list.map(a => 
      `"${a.agentId}";"${a.agentName}";"${a.team}";"${a.station}";"${assignmentsData.date}";"${a.shiftCode}";"${a.hours}";"${a.defaultPause}";"${a.isOff ? 'Repos/Congé' : 'Actif'}"`
    ).join("\n");
    return header + rows;
  }, [assignmentsData]);

  // Current Origin API URL
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apiEndpointUrl = `${apiBaseUrl}/api/shifts/daily?date=${targetDateStr}${selectedTeam !== 'all' ? `&team=${selectedTeam}` : ''}`;
  const authenticatedUrlWithQuery = `${apiEndpointUrl}&apiKey=${selectedToken?.token || 'cortex_live_sec_...'}`;

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Download CSV file
  const handleDownloadCsv = () => {
    const blob = new Blob([csvExportString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts-${targetDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON file
  const handleDownloadJson = () => {
    const blob = new Blob([jsonExportString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts-${targetDateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Test live API fetch (with or without Auth)
  const handleTestLiveApi = async (withAuth: boolean = true) => {
    try {
      setLiveApiLoading(true);
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (withAuth && selectedToken?.token) {
        headers['Authorization'] = `Bearer ${selectedToken.token}`;
      }
      const res = await fetch(apiEndpointUrl, { headers });
      setLiveApiStatus(res.status);
      const data = await res.json();
      setLiveApiResponse(data);
    } catch (err: any) {
      setLiveApiResponse({ error: err.message });
      setLiveApiStatus(500);
    } finally {
      setLiveApiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="date-shift-extractor-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="date-shift-extractor-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 ring-1 ring-white/10"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Extraction des Shifts & API Sécurisée
                </h2>
                <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  API Token Auth
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Accès programmatique sécurisé par jetons d'accès pour intégrer les plannings et shifts dans vos applications externes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Top View Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setModalTab('extractor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalTab === 'extractor'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>API & Extraction</span>
              </button>
              <button
                onClick={() => setModalTab('tokens')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalTab === 'tokens'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Gestion Clés API</span>
              </button>
            </div>

            <button
              id="close-extractor-modal-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalTab === 'tokens' ? (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <ApiTokenManager 
              selectedTokenId={selectedToken?.id}
              onSelectToken={(t) => {
                setSelectedToken(t);
                setModalTab('extractor');
              }}
            />
          </div>
        ) : (
          <>
            {/* Filter Controls Bar */}
            <div className="px-6 py-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Date Input */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <label htmlFor="extractor-date-input" className="text-xs text-slate-400 font-medium">
                    Date :
                  </label>
                  <input
                    id="extractor-date-input"
                    type="date"
                    value={targetDateStr}
                    onChange={(e) => {
                      if (e.target.value) setTargetDateStr(e.target.value);
                    }}
                    className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Team Filter */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <label htmlFor="extractor-team-select" className="text-xs text-slate-400 font-medium">
                    Équipe :
                  </label>
                  <select
                    id="extractor-team-select"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-white">Toutes ({agents.length})</option>
                    {availableTeams.map(t => (
                      <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Quick Today Jump */}
                <button
                  id="extractor-jump-today-btn"
                  onClick={() => setTargetDateStr(formatToDateStr(new Date()))}
                  className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                >
                  Aujourd'hui
                </button>
              </div>

              {/* KPI Summary badges */}
              <div className="flex items-center gap-2 text-xs font-medium">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300">
                  <span>En poste :</span>
                  <strong className="text-white">{assignmentsData.totalWorking}</strong>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                  <span>Repos/Congé :</span>
                  <strong className="text-white">{assignmentsData.totalOff}</strong>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                  <span>Total :</span>
                  <strong className="text-white">{assignmentsData.totalAgents}</strong>
                </div>
              </div>
            </div>

            {/* Modal Body: Tabs and Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[calc(90vh-140px)]">
              {/* Token Selector & Security Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Clé API active :</span>
                      <select
                        value={selectedToken?.id}
                        onChange={(e) => {
                          const t = apiTokens.find(tok => tok.id === e.target.value);
                          if (t) setSelectedToken(t);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300 font-mono-code focus:outline-none"
                      >
                        {apiTokens.map(tok => (
                          <option key={tok.id} value={tok.id}>
                            {tok.name} ({tok.token.substring(0, 16)}...) {tok.isActive ? '' : '⚠️ Désactivé'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cette clé sera insérée dans les exemples de code et requêtes cURL / JS / Python ci-dessous.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalTab('tokens')}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Gérer les clés API</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Format Switcher Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    id="extractor-format-table-btn"
                    onClick={() => setSelectedFormat('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFormat === 'table'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Tableau Aperçu</span>
                  </button>

                  <button
                    id="extractor-format-json-btn"
                    onClick={() => setSelectedFormat('json')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFormat === 'json'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>JSON Détaillé</span>
                  </button>

                  <button
                    id="extractor-format-compact-btn"
                    onClick={() => setSelectedFormat('compact')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFormat === 'compact'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>JSON Compact</span>
                  </button>

                  <button
                    id="extractor-format-csv-btn"
                    onClick={() => setSelectedFormat('csv')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFormat === 'csv'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV / Excel</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="extractor-download-json-btn"
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Télécharger JSON</span>
                  </button>

                  <button
                    id="extractor-download-csv-btn"
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Télécharger CSV</span>
                  </button>
                </div>
              </div>

              {/* 1. REST Endpoint URL Card with Live Test */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Endpoint REST Protégé :
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      GET /api/shifts/daily
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="extractor-test-api-btn"
                      onClick={() => handleTestLiveApi(true)}
                      disabled={liveApiLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${liveApiLoading ? 'animate-spin' : ''}`} />
                      <span>Tester avec Authentification</span>
                    </button>

                    <button
                      onClick={() => handleTestLiveApi(false)}
                      disabled={liveApiLoading}
                      className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-white font-medium px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-all"
                      title="Tester sans clé API pour vérifier le blocage HTTP 401 Unauthorized"
                    >
                      <span>Test sans Clé (401)</span>
                    </button>

                    <button
                      id="extractor-copy-url-btn"
                      onClick={() => handleCopy(authenticatedUrlWithQuery, 'api-url')}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                    >
                      {copiedKey === 'api-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'api-url' ? 'URL Copiée !' : 'Copier URL'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-lg p-2.5 font-mono-code text-xs text-blue-300 border border-slate-800 flex items-center justify-between gap-3 select-all overflow-x-auto">
                  <span>{apiEndpointUrl}</span>
                </div>

                {liveApiResponse && (
                  <div className={`p-3 rounded-lg text-xs space-y-1 border ${
                    liveApiStatus === 200 
                      ? 'bg-slate-950/80 border-emerald-500/30 text-slate-300' 
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {liveApiStatus === 200 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Réponse du serveur HTTP 200 OK (Authentifié)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400">Réponse HTTP {liveApiStatus} Unauthorized (Accès Sécurisé)</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] font-mono-code text-slate-400">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>

                    {liveApiStatus === 200 ? (
                      <div className="text-[11px] text-slate-400 pt-1">
                        Total agents: <strong className="text-white">{liveApiResponse.totalAgents}</strong> | 
                        Assignés: <strong className="text-white">{liveApiResponse.totalAssigned}</strong> | 
                        En poste: <strong className="text-white">{liveApiResponse.totalWorking}</strong> | 
                        Repos: <strong className="text-white">{liveApiResponse.totalOff}</strong>
                      </div>
                    ) : (
                      <div className="text-[11px] text-rose-300 pt-1">
                        {liveApiResponse.message || liveApiResponse.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Format specific view */}
              {selectedFormat === 'table' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Agents et Shifts pour le <strong className="text-white font-medium">{fullDateLabel}</strong></span>
                    <span className="font-mono-code">{assignmentsData.list.length} agents</span>
                  </div>

                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5">Agent</th>
                          <th className="px-3 py-2.5">Station</th>
                          <th className="px-3 py-2.5">Équipe</th>
                          <th className="px-4 py-2.5">Code Shift</th>
                          <th className="px-4 py-2.5">Horaires</th>
                          <th className="px-3 py-2.5">Pause</th>
                          <th className="px-3 py-2.5 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {assignmentsData.list.map((item, idx) => (
                          <tr 
                            key={item.agentId || idx}
                            className={`hover:bg-slate-800/40 transition-colors ${!item.shiftCode ? 'opacity-60 bg-slate-950/20' : ''}`}
                          >
                            <td className="px-4 py-2 font-medium text-white">
                              {item.agentName}
                            </td>
                            <td className="px-3 py-2 font-mono-code text-slate-300">
                              {item.station || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {item.team}
                            </td>
                            <td className="px-4 py-2 font-mono-code font-bold">
                              {item.shiftCode ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                  item.isOff 
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                                    : 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                                }`}>
                                  {item.shiftCode}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">Non assigné</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-mono-code text-slate-300">
                              {item.hours || '—'}
                            </td>
                            <td className="px-3 py-2 font-mono-code text-slate-400">
                              {item.defaultPause || '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {item.shiftCode ? (
                                item.isOff ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                                    Repos
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                    Actif
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedFormat === 'json' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono-code text-xs text-amber-200 overflow-x-auto max-h-[380px]">
                  <pre>{jsonExportString}</pre>
                </div>
              )}

              {selectedFormat === 'compact' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono-code text-xs text-purple-200 overflow-x-auto max-h-[380px]">
                  <pre>{compactJsonString}</pre>
                </div>
              )}

              {selectedFormat === 'csv' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono-code text-xs text-emerald-200 overflow-x-auto max-h-[380px]">
                  <pre>{csvExportString}</pre>
                </div>
              )}

              {/* 3. Code Integration Snippets with Bearer Authentication */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span>Exemples de code prêts à copier (Authentification Bearer incluse) :</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => setActiveCodeLang('curl')}
                      className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors ${
                        activeCodeLang === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setActiveCodeLang('js')}
                      className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors ${
                        activeCodeLang === 'js' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      JavaScript / Node.js
                    </button>
                    <button
                      onClick={() => setActiveCodeLang('python')}
                      className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors ${
                        activeCodeLang === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Python
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 font-mono-code text-[11px] text-slate-300 overflow-x-auto">
                    {activeCodeLang === 'curl' && (
                      <pre>
{`# 1. Requête sécurisée avec en-tête Bearer Token (Recommandé)
curl -X GET "${apiEndpointUrl}" \\
  -H "Authorization: Bearer ${selectedToken?.token || 'cortex_live_sec_...'}"

# 2. Alternative avec en-tête x-api-key
curl -X GET "${apiEndpointUrl}" \\
  -H "x-api-key: ${selectedToken?.token || 'cortex_live_sec_...'}"

# 3. Alternative avec paramètre d'URL (apiKey)
curl -X GET "${apiEndpointUrl}&apiKey=${selectedToken?.token || 'cortex_live_sec_...'}"

# 4. Format compact (Clé Agent: Code Shift)
curl -X GET "${apiEndpointUrl}&format=compact" \\
  -H "Authorization: Bearer ${selectedToken?.token || 'cortex_live_sec_...'}"`}
                      </pre>
                    )}

                    {activeCodeLang === 'js' && (
                      <pre>
{`// Exemple Fetch JavaScript / TypeScript avec Bearer Token
async function fetchDailyShifts(dateStr = "${targetDateStr}") {
  const API_KEY = "${selectedToken?.token || 'cortex_live_sec_...'}";
  const url = \`${apiBaseUrl}/api/shifts/daily?date=\${dateStr}\`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(\`Erreur API HTTP \${response.status}\`);
  }

  const data = await response.json();
  console.log(\`Total agents: \${data.totalAgents}, En poste: \${data.totalWorking}\`);
  
  data.assignments.forEach(agent => {
    console.log(\`\${agent.agentName} (\${agent.station}): \${agent.shiftCode} [\${agent.hours}]\`);
  });
  
  return data;
}

fetchDailyShifts();`}
                      </pre>
                    )}

                    {activeCodeLang === 'python' && (
                      <pre>
{`import requests

API_KEY = "${selectedToken?.token || 'cortex_live_sec_...'}"
url = "${apiEndpointUrl}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
response.raise_for_status()
data = response.json()

print(f"Date: {data['date']} ({data['dayName']})")
print(f"Total en poste: {data['totalWorking']} / {data['totalAgents']}")

for agent in data['assignments']:
    print(f"- {agent['agentName']} ({agent['station']}): {agent['shiftCode']} ({agent['hours']})")`}
                      </pre>
                    )}
                  </div>

                  <button
                    id="extractor-copy-code-snippet-btn"
                    onClick={() => {
                      let snippet = '';
                      const tok = selectedToken?.token || 'cortex_live_sec_...';
                      if (activeCodeLang === 'curl') {
                        snippet = `curl -X GET "${apiEndpointUrl}" -H "Authorization: Bearer ${tok}"`;
                      } else if (activeCodeLang === 'js') {
                        snippet = `const res = await fetch("${apiEndpointUrl}", { headers: { "Authorization": "Bearer ${tok}" } });\nconst data = await res.json();`;
                      } else {
                        snippet = `import requests\nres = requests.get("${apiEndpointUrl}", headers={"Authorization": "Bearer ${tok}"})\ndata = res.json()`;
                      }
                      handleCopy(snippet, 'snippet');
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-700 flex items-center gap-1 transition-all"
                  >
                    {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'snippet' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API active avec protection Bearer Token et support CORS complet.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="extractor-close-btn"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
