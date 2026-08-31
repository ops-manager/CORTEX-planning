import React, { useState, useEffect, useMemo } from 'react';
import { AppUser, UserRole, UserStatus, AccessControlSettings, PreApprovedEmail, Agent } from '../types';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Sliders, 
  Trash2, 
  Key, 
  Mail, 
  Globe, 
  Check, 
  X, 
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Shield,
  UserCheck,
  UserX,
  Plus,
  User as UserIcon,
  Link as LinkIcon
} from 'lucide-react';
import { 
  subscribeToAllUsers, 
  subscribeToAccessControlSettings, 
  saveAccessControlSettings, 
  updateUserAccessInFirestore, 
  deleteUserFromFirestore,
  addPreApprovedEmailInFirestore,
  removePreApprovedEmailInFirestore,
  SUPER_ADMIN_UID
} from '../firebase';

interface DatabaseAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  agents?: Agent[];
}

export const DatabaseAccessModal: React.FC<DatabaseAccessModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  agents = []
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'auto_approval'>('users');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [settings, setSettings] = useState<AccessControlSettings | null>(null);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // New Invite / Whitelist Form
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<UserRole>('manager');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [newDomain, setNewDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sorted Agents for Association
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [agents]);

  // Subscribe to Users & Settings
  useEffect(() => {
    if (!isOpen) return;

    const unsubUsers = subscribeToAllUsers((users) => {
      setUsersList(users);
    });

    const unsubSettings = subscribeToAccessControlSettings((s) => {
      setSettings(s);
    });

    return () => {
      unsubUsers();
      unsubSettings();
    };
  }, [isOpen]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Pending users count
  const pendingCount = usersList.filter((u) => u.status === 'pending').length;

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Approve User Action
  const handleApproveUser = async (targetUid: string, role: UserRole) => {
    try {
      await updateUserAccessInFirestore(
        targetUid,
        { status: 'approved', role },
        currentUser.email || currentUser.displayName || 'Admin'
      );
      showNotification(`Utilisateur approuvé avec succès avec le rôle ${role.toUpperCase()}`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de l\'approbation', 'error');
    }
  };

  // Reject / Block User Action
  const handleRejectUser = async (targetUid: string) => {
    try {
      await updateUserAccessInFirestore(
        targetUid,
        { status: 'rejected' },
        currentUser.email || currentUser.displayName || 'Admin'
      );
      showNotification('Accès utilisateur révoqué', 'error');
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors du blocage', 'error');
    }
  };

  // Change User Role Action
  const handleChangeRole = async (targetUid: string, newRole: UserRole) => {
    try {
      await updateUserAccessInFirestore(
        targetUid,
        { role: newRole },
        currentUser.email || currentUser.displayName || 'Admin'
      );
      showNotification(`Rôle mis à jour: ${newRole.toUpperCase()}`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors du changement de rôle', 'error');
    }
  };

  // Assign Agent to User Action
  const handleAssignAgent = async (targetUid: string, agentId: string) => {
    try {
      const chosenAgent = sortedAgents.find((a) => a.id === agentId);
      await updateUserAccessInFirestore(
        targetUid,
        { 
          agentId: chosenAgent ? chosenAgent.id : null,
          agentName: chosenAgent ? chosenAgent.name : null
        },
        currentUser.email || currentUser.displayName || 'Admin'
      );
      showNotification(
        chosenAgent 
          ? `Agent "${chosenAgent.name}" associé au compte` 
          : 'Association d\'agent retirée'
      );
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de l\'association de l\'agent', 'error');
    }
  };

  // Delete User Action
  const handleDeleteUser = async (targetUid: string, name: string) => {
    if (!window.confirm(`Voulez-vous supprimer définitivement le compte de ${name} ?`)) {
      return;
    }
    try {
      await deleteUserFromFirestore(targetUid);
      showNotification(`Compte de ${name} supprimé de Firestore`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de la suppression', 'error');
    }
  };

  // Toggle Auto-Approval Setting
  const handleToggleAutoApproval = async () => {
    if (!settings) return;
    try {
      const nextValue = !settings.autoApprovalEnabled;
      await saveAccessControlSettings({ autoApprovalEnabled: nextValue });
      showNotification(
        nextValue 
          ? 'Approbation automatique ACTIVÉE (les nouveaux utilisateurs ont un accès immédiat)' 
          : 'Approbation automatique DÉSACTIVÉE (validation manuelle requise)'
      );
    } catch (err: any) {
      showNotification(err.message || 'Erreur de mise à jour', 'error');
    }
  };

  // Change Default Role Setting
  const handleChangeDefaultRole = async (role: UserRole) => {
    try {
      await saveAccessControlSettings({ defaultRole: role });
      showNotification(`Rôle par défaut pour les nouveaux utilisateurs: ${role.toUpperCase()}`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur de mise à jour', 'error');
    }
  };

  // Add Allowed Domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !settings) return;
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^@/, '');
    const current = settings.allowedDomains || [];
    if (current.includes(cleanDomain)) {
      showNotification('Ce domaine est déjà enregistré', 'error');
      return;
    }
    try {
      await saveAccessControlSettings({
        allowedDomains: [...current, cleanDomain]
      });
      setNewDomain('');
      showNotification(`Domaine @${cleanDomain} ajouté à la liste blanche`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de l\'ajout du domaine', 'error');
    }
  };

  // Remove Allowed Domain
  const handleRemoveDomain = async (domainToRemove: string) => {
    if (!settings) return;
    try {
      const updated = (settings.allowedDomains || []).filter((d) => d !== domainToRemove);
      await saveAccessControlSettings({ allowedDomains: updated });
      showNotification(`Domaine @${domainToRemove} retiré`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de la suppression du domaine', 'error');
    }
  };

  // Add Pre-Approved Email Invitation with Optional Associated Agent
  const handleAddInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;
    try {
      setIsSubmitting(true);
      const chosenAgent = sortedAgents.find((a) => a.id === selectedAgentId);
      await addPreApprovedEmailInFirestore(
        newInviteEmail.trim(),
        newInviteRole,
        currentUser.email || currentUser.displayName || 'Admin',
        chosenAgent?.id,
        chosenAgent?.name
      );
      setNewInviteEmail('');
      setSelectedAgentId('');
      showNotification(
        `Invitation pré-approuvée pour ${newInviteEmail} (Rôle: ${newInviteRole.toUpperCase()}${
          chosenAgent ? ` • Agent associé: ${chosenAgent.name}` : ''
        })`
      );
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de l\'invitation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove Pre-Approved Email
  const handleRemoveInvite = async (email: string) => {
    try {
      await removePreApprovedEmailInFirestore(email);
      showNotification(`Invitation retirée pour ${email}`);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de la suppression de l\'invitation', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Permissions & Accès Base de Données
                </h3>
                <span className="text-[10px] uppercase font-mono-code font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Cloud Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestion des utilisateurs, rôles RBAC et système d'auto-approbation
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

        {/* Notification Banner */}
        {notification && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border-rose-800 text-rose-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/30 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors relative ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Utilisateurs & Demandes d'accès</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
              {usersList.length}
            </span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                {pendingCount} en attente
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auto_approval')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'auto_approval'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Auto-Approbation & Sécurité</span>
            {settings?.autoApprovalEnabled && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                Actif
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: USERS & REQUESTS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              
              {/* Filter Bar & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tous ({usersList.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      statusFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>En attente</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'approved'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Approuvés ({usersList.filter((u) => u.status === 'approved').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'rejected'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Bloqués ({usersList.filter((u) => u.status === 'rejected' || u.status === 'disabled').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, email..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Users List */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-300">Aucun utilisateur trouvé</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery ? 'Aucun résultat correspondant à votre recherche.' : 'Aucun utilisateur dans cette catégorie.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map((user) => {
                    const isSelf = user.uid === currentUser.uid;
                    const isSuper = user.uid === SUPER_ADMIN_UID;
                    const isPending = user.status === 'pending';
                    const isApproved = user.status === 'approved';
                    const isBlocked = user.status === 'rejected' || user.status === 'disabled';

                    return (
                      <div
                        key={user.uid}
                        className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                          isPending
                            ? 'bg-amber-950/20 border-amber-600/40 shadow-sm shadow-amber-500/5'
                            : isBlocked
                            ? 'bg-rose-950/10 border-rose-900/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* User identity info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-100 truncate">
                                {user.displayName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                                  Vous
                                </span>
                              )}
                              {isSuper && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
                            {user.requestReason && (
                              <p className="text-[11px] text-amber-300/90 mt-1 italic">
                                "{user.requestReason}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Role Badges & Agent Linking */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Associated Agent Selector / Tag */}
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <select
                              value={user.agentId || ''}
                              onChange={(e) => handleAssignAgent(user.uid, e.target.value)}
                              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
                              title="Associer cet utilisateur à un agent du planning"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">
                                — Aucun agent lié —
                              </option>
                              {sortedAgents.map((a) => (
                                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                                  {a.name} {a.team ? `(${a.team})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Role Selector */}
                          <select
                            value={user.role}
                            disabled={isSuper}
                            onChange={(e) => handleChangeRole(user.uid, e.target.value as UserRole)}
                            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                          >
                            <option value="admin">Administrateur</option>
                            <option value="manager">Manager (Planificateur)</option>
                            <option value="viewer">Lecteur (Consultation)</option>
                          </select>

                          {/* Status Tag */}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            {isBlocked && <XCircle className="w-3.5 h-3.5" />}
                            <span>
                              {isApproved ? 'Approuvé' : isPending ? 'En attente' : 'Bloqué'}
                            </span>
                          </span>

                          {/* Action Buttons */}
                          {isPending && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproveUser(user.uid, 'manager')}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approuver</span>
                              </button>
                              <button
                                onClick={() => handleRejectUser(user.uid)}
                                className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-medium transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Rejeter</span>
                              </button>
                            </div>
                          )}

                          {!isPending && !isSuper && !isSelf && (
                            <div className="flex items-center gap-1">
                              {isApproved ? (
                                <button
                                  onClick={() => handleRejectUser(user.uid)}
                                  title="Bloquer / Révoquer l'accès"
                                  className="p-1.5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-800 rounded-lg transition-colors"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveUser(user.uid, user.role || 'manager')}
                                  title="Réactiver / Débloquer"
                                  className="p-1.5 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-300 border border-transparent hover:border-emerald-800 rounded-lg transition-colors"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.uid, user.displayName)}
                                title="Supprimer définitivement"
                                className="p-1.5 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTO-APPROVAL & SECURITY CONFIGURATION */}
          {activeTab === 'auto_approval' && settings && (
            <div className="space-y-6">
              
              {/* 1. Global Auto-Approval Switch */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <h4 className="font-bold text-sm text-white">
                        Système d'Approbation Automatique (Auto-Approval)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      Lorsque cette option est activée, tous les nouveaux collaborateurs qui se connectent (via Google ou e-mail) obtiennent immédiatement accès à la base de données avec le rôle par défaut ci-dessous.
                    </p>
                  </div>

                  <button
                    onClick={handleToggleAutoApproval}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.autoApprovalEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.autoApprovalEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300">
                    Rôle attribué par défaut aux nouveaux inscrits :
                  </span>

                  <select
                    value={settings.defaultRole}
                    onChange={(e) => handleChangeDefaultRole(e.target.value as UserRole)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="manager">Manager (Planificateur - Droits d'écriture complets)</option>
                    <option value="viewer">Lecteur (Consultation - Lecture seule)</option>
                    <option value="admin">Administrateur (Gestion complète)</option>
                  </select>
                </div>
              </div>

              {/* 2. Allowed Email Domains */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-sm text-white">
                      Liste Blanche des Domaines d'Entreprise
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Les utilisateurs avec une adresse e-mail se terminant par ces domaines sont automatiquement approuvés, même si l'auto-approbation générale est désactivée.
                  </p>
                </div>

                {/* Form to add domain */}
                <form onSubmit={handleAddDomain} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                      @
                    </span>
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="mon-entreprise.com, cortex.io..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter domaine</span>
                  </button>
                </form>

                {/* Domain badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(settings.allowedDomains || []).length === 0 ? (
                    <span className="text-xs text-slate-500 italic">
                      Aucun domaine spécifique configuré (tous les domaines sont traités selon la règle générale).
                    </span>
                  ) : (
                    (settings.allowedDomains || []).map((dom) => (
                      <span
                        key={dom}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-xs font-mono"
                      >
                        <span>@{dom}</span>
                        <button
                          onClick={() => handleRemoveDomain(dom)}
                          className="hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Pre-Approved Email Invitations */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">
                      Pré-approbations & Invitations Ciblées
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Autorisez à l'avance des adresses e-mail précises avec un rôle pré-attribué et associez-les directement à un agent de la liste du planning.
                  </p>
                </div>

                {/* Form to pre-approve email */}
                <form onSubmit={handleAddInvite} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                      <input
                        type="email"
                        required
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        placeholder="collaborateur@compagnie.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <select
                        value={newInviteRole}
                        onChange={(e) => setNewInviteRole(e.target.value as UserRole)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="manager">Rôle: Manager</option>
                        <option value="viewer">Rôle: Lecteur</option>
                        <option value="admin">Rôle: Administrateur</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                        title="Associer à un agent du planning"
                      >
                        <option value="">— Aucun agent lié (Optionnel) —</option>
                        {sortedAgents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} {a.team ? `(${a.team})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !newInviteEmail.trim()}
                        className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Inviter</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Pre-approved list */}
                <div className="space-y-2 pt-2">
                  {(settings.preApprovedEmails || []).length === 0 ? (
                    <span className="text-xs text-slate-500 italic block">
                      Aucune invitation pré-approuvée en attente.
                    </span>
                  ) : (
                    (settings.preApprovedEmails || []).map((invite) => (
                      <div
                        key={invite.email}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs gap-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-slate-200">{invite.email}</span>
                          
                          <span className="px-2 py-0.2 rounded bg-blue-500/10 text-blue-300 text-[10px] font-semibold border border-blue-500/20">
                            {invite.role.toUpperCase()}
                          </span>

                          {invite.agentName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold border border-emerald-500/20">
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              <span>Agent : {invite.agentName}</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveInvite(invite.email)}
                          className="self-end sm:self-auto p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Supprimer cette pré-approbation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Super Admin & Owner Info */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>
                    Propriétaire principal & Super Admin Firestore : <strong className="text-slate-200 font-mono">{SUPER_ADMIN_UID}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">Contrôle ABAC Actif</span>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Modifications sauvegardées automatiquement dans Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
