import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Calendar, 
  Download, 
  Code2, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  Users, 
  Briefcase, 
  Sparkles,
  Terminal,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Agent, Shift } from '../types';
import { formatToDateStr, formatFullFrenchDate, parseDateStr } from '../utils/dateUtils';
import { API_IMPORTED_SHIFTS } from '../data/mockData';

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
  const [targetDateStr, setTargetDateStr] = useState<string>(() => formatToDateStr(initialDate));
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'compact' | 'csv' | 'table'>('table');
  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [liveApiLoading, setLiveApiLoading] = useState<boolean>(false);
  const [liveApiResponse, setLiveApiResponse] = useState<any | null>(null);

  // Sync initial date
  useEffect(() => {
    if (isOpen) {
      setTargetDateStr(formatToDateStr(initialDate));
      setLiveApiResponse(null);
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
    // Add default shifts
    API_IMPORTED_SHIFTS.forEach(s => map.set(s.code.toLowerCase(), s));
    // Add custom shifts
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

  // Test live API fetch
  const handleTestLiveApi = async () => {
    try {
      setLiveApiLoading(true);
      const res = await fetch(apiEndpointUrl);
      const data = await res.json();
      setLiveApiResponse(data);
    } catch (err: any) {
      setLiveApiResponse({ error: err.message });
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
                  Extraction des Shifts & API par Date
                </h2>
                <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REST API & JSON
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Récupérez tous les shifts assignés aux agents pour n'importe quelle date afin de les intégrer dans votre autre application.
              </p>
            </div>
          </div>

          <button
            id="close-extractor-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              <span>Assignés:</span>
              <strong className="text-white font-mono-code">{assignmentsData.totalAssigned} / {assignmentsData.totalAgents}</strong>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span>En poste:</span>
              <strong className="text-white font-mono-code">{assignmentsData.totalWorking}</strong>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
              <span>Repos/Congé:</span>
              <strong className="text-white font-mono-code">{assignmentsData.totalOff}</strong>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-1">
            <button
              id="extractor-tab-table"
              onClick={() => setSelectedFormat('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                selectedFormat === 'table'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Aperçu Tableau ({assignmentsData.list.length})</span>
            </button>

            <button
              id="extractor-tab-json"
              onClick={() => setSelectedFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                selectedFormat === 'json'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON Complet</span>
            </button>

            <button
              id="extractor-tab-compact"
              onClick={() => setSelectedFormat('compact')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                selectedFormat === 'compact'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>JSON Compact (Clé:Valeur)</span>
            </button>

            <button
              id="extractor-tab-csv"
              onClick={() => setSelectedFormat('csv')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                selectedFormat === 'csv'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>

          {/* Quick Copy / Download Actions */}
          <div className="flex items-center gap-2 pb-2">
            {selectedFormat === 'json' && (
              <>
                <button
                  id="extractor-copy-json-btn"
                  onClick={() => handleCopy(jsonExportString, 'json')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium border border-slate-700 transition-all"
                >
                  {copiedKey === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'json' ? 'Copié !' : 'Copier JSON'}</span>
                </button>
                <button
                  id="extractor-dl-json-btn"
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-md text-xs font-medium transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </button>
              </>
            )}

            {selectedFormat === 'compact' && (
              <button
                id="extractor-copy-compact-btn"
                onClick={() => handleCopy(compactJsonString, 'compact')}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium border border-slate-700 transition-all"
              >
                {copiedKey === 'compact' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'compact' ? 'Copié !' : 'Copier JSON Compact'}</span>
              </button>
            )}

            {selectedFormat === 'csv' && (
              <>
                <button
                  id="extractor-copy-csv-btn"
                  onClick={() => handleCopy(csvExportString, 'csv')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium border border-slate-700 transition-all"
                >
                  {copiedKey === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'csv' ? 'Copié !' : 'Copier CSV'}</span>
                </button>
                <button
                  id="extractor-dl-csv-btn"
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-md text-xs font-medium transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger CSV</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-950/40">
          {/* 1. REST API URL Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-600 text-white font-mono-code font-bold text-[11px] rounded">
                  GET
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Endpoint REST direct pour votre autre application :
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="extractor-test-api-btn"
                  onClick={handleTestLiveApi}
                  disabled={liveApiLoading}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${liveApiLoading ? 'animate-spin' : ''}`} />
                  <span>Tester la requête API</span>
                </button>

                <button
                  id="extractor-copy-url-btn"
                  onClick={() => handleCopy(apiEndpointUrl, 'api-url')}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
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
              <div className="mt-2 p-3 bg-slate-950/80 border border-emerald-500/30 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Réponse du serveur HTTP 200 OK</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Total agents: <strong className="text-white">{liveApiResponse.totalAgents}</strong> | 
                  Assignés: <strong className="text-white">{liveApiResponse.totalAssigned}</strong> | 
                  En poste: <strong className="text-white">{liveApiResponse.totalWorking}</strong> | 
                  Repos: <strong className="text-white">{liveApiResponse.totalOff}</strong>
                </div>
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

          {/* 3. Code Integration Snippets for Developers */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Exemples d'intégration dans votre application externe :</span>
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
{`# 1. Obtenir tous les shifts pour le ${targetDateStr}
curl -X GET "${apiEndpointUrl}"

# 2. Obtenir au format compact (Clé Agent: Code Shift)
curl -X GET "${apiEndpointUrl}&format=compact"

# 3. Télécharger directement en CSV
curl -X GET "${apiEndpointUrl}&format=csv" -o shifts-${targetDateStr}.csv`}
                  </pre>
                )}

                {activeCodeLang === 'js' && (
                  <pre>
{`// Exemple Fetch JavaScript / TypeScript
async function getAgentShiftsForDate(dateStr = "${targetDateStr}") {
  const url = \`${apiBaseUrl}/api/shifts/daily?date=\${dateStr}\`;
  const response = await fetch(url);
  const data = await response.json();
  
  console.log(\`Total agents: \${data.totalAgents}, Total assignés: \${data.totalAssigned}\`);
  data.assignments.forEach(agent => {
    console.log(\`\${agent.agentName} (\${agent.station}): \${agent.shiftCode} [\${agent.hours}]\`);
  });
  
  return data;
}

getAgentShiftsForDate();`}
                  </pre>
                )}

                {activeCodeLang === 'python' && (
                  <pre>
{`import requests

url = "${apiEndpointUrl}"
response = requests.get(url)
data = response.json()

print(f"Date: {data['date']} - {data['dayName']}")
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
                  if (activeCodeLang === 'curl') {
                    snippet = `curl -X GET "${apiEndpointUrl}"`;
                  } else if (activeCodeLang === 'js') {
                    snippet = `const res = await fetch("${apiEndpointUrl}");\nconst data = await res.json();`;
                  } else {
                    snippet = `import requests\nres = requests.get("${apiEndpointUrl}")\ndata = res.json()`;
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

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API active avec support CORS complet pour requêtes cross-origin.</span>
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
