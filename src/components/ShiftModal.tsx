import React, { useState, useEffect } from 'react';
import { Shift, ShiftSeason } from '../types';
import { 
  getShiftStyle, 
  calculateShiftDurationHours, 
  COLOR_PRESETS,
  getSeasonInfo 
} from '../utils/shiftUtils';
import { 
  X, 
  Clock, 
  Layers, 
  Check, 
  AlertCircle, 
  Palette, 
  Sun, 
  Snowflake, 
  Globe, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftData: Shift) => Promise<void>;
  initialShift?: Shift | null;
  existingShifts: Shift[];
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialShift,
  existingShifts
}) => {
  const isEditing = Boolean(initialShift);

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('16:30');
  const [isRestShift, setIsRestShift] = useState(false);
  const [color, setColor] = useState<string>('amber');
  const [customHex, setCustomHex] = useState<string>('#f59e0b');
  const [season, setSeason] = useState<ShiftSeason>('all');
  const [hidden, setHidden] = useState<boolean>(false);
  const [defaultPause, setDefaultPause] = useState('');
  const [defaultMissionId, setDefaultMissionId] = useState('');
  const [order, setOrder] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialShift) {
      setCode(initialShift.code || '');
      setLabel(initialShift.label || '');
      if (initialShift.hours === '00:00 - 00:00') {
        setIsRestShift(true);
        setStartHour('00:00');
        setEndHour('00:00');
      } else {
        setIsRestShift(false);
        const parts = (initialShift.hours || '08:00 - 16:30').split('-').map(s => s.trim());
        setStartHour(parts[0] || '08:00');
        setEndHour(parts[1] || '16:30');
      }
      setColor(initialShift.color || 'amber');
      if (initialShift.color?.startsWith('#')) {
        setCustomHex(initialShift.color);
      }
      setSeason(initialShift.season || 'all');
      setHidden(Boolean(initialShift.hidden));
      setDefaultPause(initialShift.defaultPause || '');
      setDefaultMissionId(initialShift.defaultMissionId || '');
      setOrder(initialShift.order ?? existingShifts.length);
    } else {
      setCode('');
      setLabel('');
      setIsRestShift(false);
      setStartHour('08:00');
      setEndHour('16:30');
      setColor('amber');
      setCustomHex('#f59e0b');
      setSeason('all');
      setHidden(false);
      setDefaultPause('');
      setDefaultMissionId('');
      setOrder(existingShifts.length);
    }
    setError(null);
  }, [initialShift, isOpen, existingShifts.length]);

  if (!isOpen) return null;

  const computedHours = isRestShift ? '00:00 - 00:00' : `${startHour.trim()} - ${endHour.trim()}`;
  const duration = calculateShiftDurationHours(computedHours);
  const activeColor = color.startsWith('#') ? color : (COLOR_PRESETS.find(p => p.id === color)?.hex || customHex);
  const shiftStyle = getShiftStyle(code || 'M', activeColor);
  const seasonInfo = getSeasonInfo(season);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setError('Le code du shift est obligatoire (ex: M5, s2, rh, j1, CA...).');
      return;
    }

    // Duplicate check
    const isDuplicate = existingShifts.some(
      s => s.code.toLowerCase() === cleanCode.toLowerCase() && s.id !== initialShift?.id
    );
    if (isDuplicate) {
      setError(`Un shift avec le code "${cleanCode}" existe déjà.`);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const shiftData: Shift = {
        id: initialShift?.id || `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        code: cleanCode,
        label: label.trim() || undefined,
        hours: computedHours,
        order: Number(order) || 0,
        color: activeColor,
        season,
        hidden,
        defaultPause: defaultPause.trim(),
        defaultMissionId: defaultMissionId.trim(),
        ownerId: initialShift?.ownerId || 'nJxGjmZvHxZNnaIV5BXiRjiq0Cv2'
      };

      await onSave(shiftData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement du shift.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="shift-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-lg border flex items-center justify-center"
              style={{ backgroundColor: `${activeColor}20`, borderColor: `${activeColor}60` }}
            >
              <Layers className="w-4 h-4" style={{ color: activeColor }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {isEditing ? `Modifier le shift ${initialShift?.code}` : 'Créer un nouveau shift'}
              </h3>
              <p className="text-xs text-slate-400">
                Couleur, saison, horaires & roulements
              </p>
            </div>
          </div>
          <button
            id="close-shift-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 text-rose-300 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview Banner */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Saison :</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${seasonInfo.badgeClass}`}>
                <span>{seasonInfo.icon}</span>
                <span>{seasonInfo.label}</span>
              </span>
              {hidden && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Masqué
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded font-mono-code font-bold text-xs border tracking-wider shadow-sm ${shiftStyle.badgeClass}`}
                style={shiftStyle.customStyle}
              >
                {code || 'CODE'}
              </span>
              <span className="text-xs text-slate-300 font-mono-code">
                {computedHours} {duration > 0 ? `(${duration}h)` : ''}
              </span>
            </div>
          </div>

          {/* Section 1: Code & Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Code du shift <span className="text-rose-400">*</span>
              </label>
              <input
                id="shift-code-input"
                type="text"
                required
                placeholder="ex: M1, m1, J, s2, rh, CA..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono-code focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Libellé / Titre descriptif
              </label>
              <input
                id="shift-label-input"
                type="text"
                placeholder="ex: Matin standard, Renfort nuit..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
          </div>

          {/* Section 2: COLOUR SELECTOR */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                <span>Couleur d'identification</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-code text-slate-400 uppercase">{activeColor}</span>
                <input
                  type="color"
                  value={activeColor.startsWith('#') ? activeColor : '#3b82f6'}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setCustomHex(e.target.value);
                  }}
                  className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                  title="Choisir une couleur personnalisée"
                />
              </div>
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 pt-1">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = activeColor.toLowerCase() === preset.hex.toLowerCase() || color === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setColor(preset.hex);
                      setCustomHex(preset.hex);
                    }}
                    title={preset.name}
                    className={`
                      group h-7 rounded-lg border flex items-center justify-center transition-all relative
                      ${isSelected ? 'ring-2 ring-white scale-105 shadow-md' : 'hover:scale-105 border-slate-700/60 opacity-80 hover:opacity-100'}
                    `}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-slate-950 drop-shadow font-extrabold stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: SEASON SELECTOR (Hiver / Été / Toute l'année) */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Saison d'application (Filtre Hiver / Été)</span>
              <span className="text-[10px] text-slate-400 font-normal">Permet de filtrer l'affichage</span>
            </label>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'all', label: "Toute l'année", icon: Globe, color: 'text-slate-300', activeBg: 'bg-slate-800 border-blue-500 text-white' },
                { id: 'winter', label: 'Shift Hiver', icon: Snowflake, color: 'text-cyan-400', activeBg: 'bg-cyan-950/70 border-cyan-500 text-cyan-200' },
                { id: 'summer', label: 'Shift Été', icon: Sun, color: 'text-amber-400', activeBg: 'bg-amber-950/70 border-amber-500 text-amber-200' }
              ].map((item) => {
                const isSelected = season === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`season-option-${item.id}`}
                    onClick={() => setSeason(item.id as ShiftSeason)}
                    className={`
                      flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all
                      ${isSelected 
                        ? `${item.activeBg} ring-1 ring-offset-0 shadow-sm` 
                        : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800 text-slate-400'}
                    `}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${item.color}`} />
                    <span className="text-[11px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Visibility Toggle (Masquer/Afficher le shift) */}
          <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              {hidden ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {hidden ? 'Shift masqué de la liste active' : 'Shift visible et actif'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {hidden ? 'Ne sera pas affiché dans la palette rapide sauf si réactivé' : 'Visible dans la légende et les outils de tamponnage'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="shift-hidden-checkbox"
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Section 5: Repos / Off shift toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Shift de repos / absence (RH/CA)</span>
              <span className="text-[11px] text-slate-400 block">Définit les heures à 00:00 - 00:00 (0h travaillées)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRestShift}
                onChange={(e) => setIsRestShift(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Section 6: Hours inputs if not rest */}
          {!isRestShift && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Heure début
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="shift-start-hour-input"
                    type="time"
                    required
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Heure fin
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="shift-end-hour-input"
                    type="time"
                    required
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Pause & Ordre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pause par défaut (optionnel)
              </label>
              <input
                id="shift-pause-input"
                type="time"
                value={defaultPause}
                onChange={(e) => setDefaultPause(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ordre d'affichage
              </label>
              <input
                id="shift-order-input"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              id="cancel-shift-btn"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="save-shift-btn"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le shift'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
