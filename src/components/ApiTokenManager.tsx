import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { ApiToken } from '../types';
import { 
  getApiTokensFromFirestore, 
  createApiTokenInFirestore, 
  toggleApiTokenInFirestore, 
  deleteApiTokenFromFirestore,
  DEFAULT_MASTER_API_TOKEN
} from '../firebase';

interface ApiTokenManagerProps {
  onSelectToken?: (token: ApiToken) => void;
  selectedTokenId?: string;
}

export const ApiTokenManager: React.FC<ApiTokenManagerProps> = ({
  onSelectToken,
  selectedTokenId
}) => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTokenName, setNewTokenName] = useState<string>('');
  const [newTokenExpiry, setNewTokenExpiry] = useState<string>('');
  const [createdTokenNotice, setCreatedTokenNotice] = useState<ApiToken | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [visibleTokenIds, setVisibleTokenIds] = useState<Set<string>>(new Set());

  // Load tokens from Firestore
  const loadTokens = async () => {
    try {
      setLoading(true);
      const data = await getApiTokensFromFirestore();
      setTokens(data);
      if (onSelectToken && data.length > 0 && !selectedTokenId) {
        onSelectToken(data[0]);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    try {
      setLoading(true);
      const created = await createApiTokenInFirestore(
        newTokenName.trim(),
        'Session Ops Manager',
        newTokenExpiry ? new Date(newTokenExpiry).toISOString() : undefined
      );
      setTokens(prev => [created, ...prev]);
      setCreatedTokenNotice(created);
      setNewTokenName('');
      setNewTokenExpiry('');
      setIsCreating(false);
      if (onSelectToken) onSelectToken(created);
    } catch (err) {
      console.error('Failed to create token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleToken = async (token: ApiToken) => {
    try {
      const nextState = !token.isActive;
      await toggleApiTokenInFirestore(token.id, nextState);
      setTokens(prev => prev.map(t => t.id === token.id ? { ...t, isActive: nextState } : t));
    } catch (err) {
      console.error('Failed to toggle token:', err);
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment révoquer et supprimer définitivement cette clé API ?')) {
      return;
    }
    try {
      await deleteApiTokenFromFirestore(id);
      setTokens(prev => prev.filter(t => t.id !== id));
      if (createdTokenNotice?.id === id) setCreatedTokenNotice(null);
    } catch (err) {
      console.error('Failed to delete token:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    setVisibleTokenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Sécurité & Authentification des Endpoints</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Bearer Token Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chaque requête vers l'API REST requiert une clé API valide. Vous pouvez transmettre votre clé via l'en-tête <code className="text-blue-300 font-mono-code bg-slate-950 px-1 py-0.5 rounded">Authorization: Bearer &lt;TOKEN&gt;</code>, <code className="text-blue-300 font-mono-code bg-slate-950 px-1 py-0.5 rounded">x-api-key: &lt;TOKEN&gt;</code> ou le paramètre d'URL <code className="text-blue-300 font-mono-code bg-slate-950 px-1 py-0.5 rounded">?apiKey=&lt;TOKEN&gt;</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={loadTokens}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition-colors"
            title="Rafraîchir les clés API"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Générer une clé API</span>
          </button>
        </div>
      </div>

      {/* Notice on newly created token */}
      {createdTokenNotice && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Nouvelle clé API générée avec succès : {createdTokenNotice.name}</span>
            </div>
            <button
              onClick={() => setCreatedTokenNotice(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Fermer
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Copiez votre jeton secret dès maintenant. Il est prêt à être utilisé immédiatement pour vos intégrations externes.
          </p>
          <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-emerald-500/30">
            <code className="text-xs font-mono-code text-emerald-300 select-all flex-1 truncate">
              {createdTokenNotice.token}
            </code>
            <button
              onClick={() => handleCopy(createdTokenNotice.token, `created-${createdTokenNotice.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
            >
              {copiedTokenId === `created-${createdTokenNotice.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTokenId === `created-${createdTokenNotice.id}` ? 'Copié !' : 'Copier le jeton'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Creation Modal / Form */}
      {isCreating && (
        <form onSubmit={handleCreateToken} className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              Générer un nouveau Jeton API CORTEX
            </h4>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)} 
              className="text-slate-400 hover:text-white text-xs"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Nom ou Application cible *
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={e => setNewTokenName(e.target.value)}
                placeholder="Ex: Bot Discord, Dashboard RH, Paie..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Date d'expiration (Optionnel)
              </label>
              <input
                type="date"
                value={newTokenExpiry}
                onChange={e => setNewTokenExpiry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!newTokenName.trim() || loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Créer la clé API</span>
            </button>
          </div>
        </form>
      )}

      {/* Tokens List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Clés API Actives ({tokens.length})</span>
          <span className="text-[11px] text-slate-400">Stockage sécurisé Firestore</span>
        </div>

        {loading && tokens.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Chargement des jetons d'accès...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Key className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>Aucune clé API configurée. Cliquez sur "Générer une clé API" pour en créer une.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {tokens.map(token => {
              const isVisible = visibleTokenIds.has(token.id);
              const isSelected = selectedTokenId === token.id;

              return (
                <div 
                  key={token.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-blue-950/20' : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white">{token.name}</span>
                      
                      {token.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          Désactivé
                        </span>
                      )}

                      {token.id === 'token_default_master' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-slate-800 text-slate-400 border border-slate-700">
                          Système / Master
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono-code text-blue-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 select-all">
                        {isVisible ? token.token : (token.prefix || `${token.token.substring(0, 16)}...`)}
                      </code>

                      <button
                        onClick={() => toggleVisibility(token.id)}
                        className="p-1 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                        title={isVisible ? "Masquer le jeton complet" : "Afficher le jeton complet"}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleCopy(token.token, token.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors"
                      >
                        {copiedTokenId === token.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTokenId === token.id ? 'Copié !' : 'Copier'}</span>
                      </button>

                      {onSelectToken && (
                        <button
                          onClick={() => onSelectToken(token)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Clé sélectionnée' : 'Utiliser pour les snippets'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono-code pt-0.5">
                      <span>Créée le : {new Date(token.createdAt).toLocaleDateString('fr-FR')}</span>
                      {token.lastUsedAt && (
                        <span>• Dernière utilisation : {new Date(token.lastUsedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {token.expiresAt && (
                        <span>• Expire le : {new Date(token.expiresAt).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleToken(token)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        token.isActive
                          ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-300'
                          : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-500/30'
                      }`}
                    >
                      {token.isActive ? 'Désactiver' : 'Activer'}
                    </button>

                    {token.id !== 'token_default_master' && (
                      <button
                        onClick={() => handleDeleteToken(token.id)}
                        className="p-1.5 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Révoquer et supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
