import React, { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, MonitorPlay, Trash2, Circle, Save, FolderOpen, X, Square, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

type EntityType = 'player' | 'ball' | 'marker_square' | 'marker_circle' | 'marker_line';
type Team = 'A' | 'B';

interface Entity {
  id: string;
  type: EntityType;
  team?: Team;
  number?: string;
  path: { x: number; y: number }[];
  w?: number;
  h?: number;
  r?: number;
  scale?: number;
}

interface SavedTactic {
  id: string;
  name: string;
  createdAt: number;
  entities: Entity[];
  maxSteps: number;
}


// 115x74 aspect ratio pitch coordinates
const PitchMarks = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    viewBox="0 0 115 74" 
    preserveAspectRatio="none"
  >
     <g stroke="rgba(209,250,229,0.3)" strokeWidth="0.4" fill="none">
        <rect x="5" y="3" width="105" height="68" strokeWidth="0.6" />
        <line x1="57.5" y1="3" x2="57.5" y2="71" strokeWidth="0.6" />
        <circle cx="57.5" cy="37" r="9.15" />
        <circle cx="57.5" cy="37" r="0.5" fill="rgba(209,250,229,0.3)" />
        
        {/* Left Side */}
        <rect x="5" y="16.84" width="16.5" height="40.32" />
        <rect x="5" y="27.84" width="5.5" height="18.32" />
        <circle cx="16" cy="37" r="0.5" fill="rgba(209,250,229,0.3)" />
        <path d="M 21.5 29.69 A 9.15 9.15 0 0 1 21.5 44.31" />
        <rect x="3" y="33.34" width="2" height="7.32" strokeWidth="0.6" />

        {/* Right Side */}
        <rect x="93.5" y="16.84" width="16.5" height="40.32" />
        <rect x="104.5" y="27.84" width="5.5" height="18.32" />
        <circle cx="99" cy="37" r="0.5" fill="rgba(209,250,229,0.3)" />
        <path d="M 93.5 44.31 A 9.15 9.15 0 0 1 93.5 29.69" />
        <rect x="110" y="33.34" width="2" height="7.32" strokeWidth="0.6" />
     </g>
  </svg>
);

const PlayerPiece = ({ entity, isGhost, isSelected }: { entity: Entity, isGhost?: boolean, isSelected?: boolean }) => {
  const bg = entity.team === 'A' ? 'bg-blue-600' : 'bg-rose-600';
  const border = entity.team === 'A' ? 'border-blue-400' : 'border-rose-400';
  
  return (
    <div className={`w-[2.25cqw] aspect-square min-w-[14px] max-w-[28px] rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl touch-none select-none
      ${bg} ${border} border-[2px]
      ${isGhost ? 'opacity-40 !border-dashed !shadow-none cursor-move border-[1px]' : 'cursor-grab active:cursor-grabbing'}
      ${isSelected && !isGhost ? 'ring-[2px] ring-emerald-400 ring-offset-1 ring-offset-emerald-900' : ''}
    `}>
      <span className="text-[min(1.25cqw,12px)] leading-none">{entity.number}</span>
    </div>
  );
};

const BallPiece = ({ isGhost, isSelected }: { isGhost?: boolean, isSelected?: boolean }) => (
  <div className={`relative w-[1.75cqw] aspect-square min-w-[12px] max-w-[20px] rounded-full border-[1.5px] border-slate-900 flex items-center justify-center shadow-lg touch-none select-none
    ${isGhost ? 'opacity-40 !border-dashed !shadow-none cursor-move' : 'bg-white cursor-grab active:cursor-grabbing'}
    ${isSelected && !isGhost ? 'ring-[2px] ring-emerald-400 ring-offset-1 ring-offset-emerald-900' : ''}
  `}>
    {!isGhost && <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),transparent)] pointer-events-none" />}
    <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] text-slate-800" fill="currentColor">
       <path d="M12 2l3 5h-6zM15 7l4 3-2 5h-4zM9 7h-4l1 5 2 5h4zM10 15h4l-2 4z"/>
    </svg>
  </div>
);

const MarkerPiece = ({ type, isGhost, isSelected, w, h, r = 0, scale, onTransformDown }: { type: EntityType, isGhost?: boolean, isSelected?: boolean, w?: number, h?: number, r?: number, scale?: number, onTransformDown?: (e: React.PointerEvent, action: string) => void }) => {
  const isLine = type === 'marker_line';
  const isSquare = type === 'marker_square';
  const shapeClass = isLine ? 'rounded-full' : isSquare ? 'rounded-none' : 'rounded-full';
  
  // Use scale as a fallback multiplier for the default sizes if w/h are not set
  const baseW = isLine ? 30 : 15;
  const baseH = isLine ? 2 : 15;
  const width = w ?? (baseW * (scale || 1));
  const height = h ?? (baseH * (scale || 1));
  
  return (
    <div 
      style={{ width: `${width}cqw`, height: `${height}cqw`, transform: `rotate(${r}deg)` }}
      className={`relative touch-none select-none ${shapeClass} flex items-center justify-center
      ${isGhost ? 'opacity-20 cursor-move' : 'cursor-grab active:cursor-grabbing bg-yellow-400/40 border-2 border-yellow-400/70'}
      ${isSelected && !isGhost ? 'ring-[2px] ring-emerald-400/50' : ''}
    `}>
      {!isGhost && <div className={`absolute inset-0 flex items-center justify-center ${shapeClass} overflow-hidden pointer-events-none`}>
         <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(250,204,21,0.2)_10px,rgba(250,204,21,0.2)_20px)] mix-blend-overlay opacity-50" />
      </div>}
      
      {isSelected && !isGhost && onTransformDown && (
        <>
           <div 
             className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-slate-400 rounded-full cursor-alias z-50 flex items-center justify-center shadow-md active:bg-emerald-50 hover:scale-110 transition-transform"
             onPointerDown={e => onTransformDown(e, 'rotate')}
           >
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
           </div>
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-slate-400 z-40 pointer-events-none" />

           <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-nw')} />
           <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-nesw-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-ne')} />
           <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-nesw-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-sw')} />
           <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-se')} />
           
           <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-w')} />
           <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-e')} />
           <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-n')} />
           <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border border-slate-400 rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform" onPointerDown={e => onTransformDown(e, 'resize-s')} />
        </>
      )}
    </div>
  );
};

export default function App() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [maxSteps, setMaxSteps] = useState(1);
  const [activeStep, setActiveStep] = useState(0); // 0 = Design (setup)
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [teamANextNum, setTeamANextNum] = useState(1);
  const [teamBNextNum, setTeamBNextNum] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string, entitySnapshot: Entity, stepIndex: number } | null>(null);
  const [transformState, setTransformState] = useState<{ 
    id: string, 
    action: string, 
    initialX: number, 
    initialY: number, 
    initialW: number,
    initialH: number,
    initialR: number,
    centerX: number,
    centerY: number
  } | null>(null);

  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [newTacticName, setNewTacticName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('tatica_pro_saves');
    if (saved) {
      try {
        setSavedTactics(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved tactics", e);
      }
    }
  }, []);

  const saveTactic = () => {
    if (!newTacticName.trim() || entities.length === 0) return;
    const newTactic: SavedTactic = {
       id: Date.now().toString(),
       name: newTacticName.trim(),
       createdAt: Date.now(),
       entities,
       maxSteps
    };
    const updated = [...savedTactics, newTactic];
    setSavedTactics(updated);
    localStorage.setItem('tatica_pro_saves', JSON.stringify(updated));
    setIsSaveModalOpen(false);
    setNewTacticName('');
  };

  const loadTactic = (tactic: SavedTactic) => {
    setEntities(tactic.entities);
    setMaxSteps(tactic.maxSteps);
    setActiveStep(0);
    setIsPlaying(false);
    setIsLoadModalOpen(false);
    
    // Resume correct numbers for teams based on loaded entities
    const aNums = tactic.entities.filter(e => e.team === 'A' && e.number).map(e => parseInt(e.number!)).filter(n => !isNaN(n));
    const bNums = tactic.entities.filter(e => e.team === 'B' && e.number).map(e => parseInt(e.number!)).filter(n => !isNaN(n));
    setTeamANextNum(aNums.length > 0 ? Math.max(...aNums) + 1 : 1);
    setTeamBNextNum(bNums.length > 0 ? Math.max(...bNums) + 1 : 1);
  };

  const deleteTactic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTactics.filter(t => t.id !== id);
    setSavedTactics(updated);
    localStorage.setItem('tatica_pro_saves', JSON.stringify(updated));
  };

  const addPlayer = (team: Team) => {
    const num = team === 'A' ? teamANextNum : teamBNextNum;
    setEntities(prev => [
      ...prev, 
      { 
        id: `player_${team}_${Date.now()}`, 
        type: 'player', 
        team, 
        number: num.toString(), 
        path: Array(maxSteps + 1).fill({ x: 50, y: team === 'A' ? 20 : 80 })
      }
    ]);
    if (team === 'A') setTeamANextNum(v => v + 1);
    else setTeamBNextNum(v => v + 1);
    setIsPlaying(false);
  };

  const addBall = () => {
    setEntities(prev => [
      ...prev,
      {
        id: `ball_${Date.now()}`,
        type: 'ball',
        path: Array(maxSteps + 1).fill({ x: 50, y: 50 })
      }
    ]);
    setIsPlaying(false);
  };

  const addMarker = (type: 'marker_square' | 'marker_circle' | 'marker_line') => {
    setEntities(prev => [
      ...prev,
      {
        id: `marker_${Date.now()}`,
        type,
        path: Array(maxSteps + 1).fill({ x: 50, y: 50 }),
      }
    ]);
    setIsPlaying(false);
  };

  const addMovementStep = () => {
    setMaxSteps(s => s + 1);
    setActiveStep(maxSteps + 1);
    setEntities(prev => prev.map(ent => ({
      ...ent,
      path: [...ent.path, { ...ent.path[ent.path.length - 1] }]
    })));
    setIsPlaying(false);
  };

  const removeMovementStep = () => {
    if (maxSteps <= 1) return;
    setMaxSteps(s => s - 1);
    setActiveStep(Math.min(activeStep, maxSteps - 1));
    setEntities(prev => prev.map(ent => ({
      ...ent,
      path: ent.path.slice(0, -1)
    })));
    setIsPlaying(false);
  };

  const clearBoard = () => {
    if (window.confirm('Limpar todas as peças do campo?')) {
      setEntities([]);
      setSelectedId(null);
      setIsPlaying(false);
      setTeamANextNum(1);
      setTeamBNextNum(1);
      setMaxSteps(1);
      setActiveStep(0);
    }
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    setDragState({ id, entitySnapshot: entities.find(ent => ent.id === id)!, stepIndex: activeStep });
  };

  const handleTransformDown = (id: string, e: React.PointerEvent, action: string) => {
    e.stopPropagation();
    if (isPlaying) return;
    const entity = entities.find(ent => ent.id === id);
    if (!entity) return;
    if (!pitchRef.current) return;
    
    // Find the center of the entity by querying its DOM element based on id to do rotation properly,
    // or we can calculate the center from path:
    const rect = pitchRef.current.getBoundingClientRect();
    const pos = entity.path[activeStep];
    const centerX = rect.left + (pos.x / 100) * rect.width;
    const centerY = rect.top + (pos.y / 100) * rect.height;

    const baseW = entity.type === 'marker_line' ? 30 : 15;
    const baseH = entity.type === 'marker_line' ? 2 : 15;
    const scaleMult = entity.scale || 1;

    setTransformState({ 
      id, 
      action, 
      initialX: e.clientX, 
      initialY: e.clientY, 
      initialW: entity.w ?? (baseW * scaleMult),
      initialH: entity.h ?? (baseH * scaleMult),
      initialR: entity.r ?? 0,
      centerX,
      centerY
    });
  };

  useEffect(() => {
    if (!transformState) return;

    const handleMove = (e: PointerEvent) => {
      if (!pitchRef.current) return;
      const rect = pitchRef.current.getBoundingClientRect();
      // cqw is width / 100. Let's make it more robust.
      // 1 cqw in pixels is rect.width / 100;
      const cqwPx = rect.width / 100;
      
      const dx = e.clientX - transformState.initialX;
      const dy = e.clientY - transformState.initialY;
      
      const { action, initialW, initialH, initialR, centerX, centerY } = transformState;
      let newW = initialW;
      let newH = initialH;
      let newR = initialR;

      if (action === 'rotate') {
        const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = (rad * 180) / Math.PI;
        // The handle is at the top, which by default is -90 degrees from center
        deg = deg + 90;
        newR = deg;
      } else {
        // resize: un-rotate the drag vector so we can apply it to w and h
        const rad = (-initialR * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        
        const deltaW = localDx / cqwPx;
        const deltaH = localDy / cqwPx;
        
        // When dragright, right edge moves by deltaW. Center is stuck, so width increases by deltaW * 2
        // When dragleft, left edge moves by deltaW. Center is stuck, so width increases by -deltaW * 2
        
        if (action.includes('e')) newW = Math.max(1, initialW + deltaW * 2);
        if (action.includes('w')) newW = Math.max(1, initialW - deltaW * 2);
        if (action.includes('s')) newH = Math.max(1, initialH + deltaH * 2);
        if (action.includes('n')) newH = Math.max(1, initialH - deltaH * 2);
      }

      setEntities(prev => prev.map(ent => {
        if (ent.id === transformState.id) {
           return { ...ent, w: newW, h: newH, r: newR };
        }
        return ent;
      }));
    };

    const handleUp = () => {
      setTransformState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [transformState]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      if (!pitchRef.current) return;
      const rect = pitchRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      setEntities(prev => prev.map(ent => {
        if (ent.id === dragState.id) {
           const newPath = [...dragState.entitySnapshot.path];
           const initialActivePos = dragState.entitySnapshot.path[dragState.stepIndex];
           const dx = x - initialActivePos.x;
           const dy = y - initialActivePos.y;
           
           for(let i = dragState.stepIndex; i < newPath.length; i++) {
              newPath[i] = { x: newPath[i].x + dx, y: newPath[i].y + dy };
           }
           
           return { ...ent, path: newPath };
        }
        return ent;
      }));
    };

    const handleUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans lg:overflow-hidden">
      {/* Sidebar Toolbar */}
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 shrink-0 flex flex-col gap-6 lg:overflow-y-auto z-20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MonitorPlay className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase italic">Tática<span className="text-emerald-400">Pro</span></h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Adicionar Peças</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => addPlayer('A')} className="flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg border-[2px] border-blue-400 uppercase text-[10px] tracking-wider">
              Time A
            </button>
            <button onClick={() => addPlayer('B')} className="flex items-center justify-center gap-2 p-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors shadow-lg border-[2px] border-rose-400 uppercase text-[10px] tracking-wider">
              Time B
            </button>
          </div>
          <button onClick={addBall} className="w-full flex items-center justify-center gap-2 p-2.5 bg-white hover:bg-gray-100 text-slate-900 font-bold rounded-lg shadow-lg border-[2px] border-slate-300 transition-colors uppercase text-[10px] tracking-wider mt-2">
            <Circle size={16} fill="black" stroke="black" /> Bola
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Marcações</h2>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => addMarker('marker_square')} className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 transition-colors uppercase text-[9px] tracking-wider">
              <Square size={16} strokeWidth={2} /> Quadrado
            </button>
            <button onClick={() => addMarker('marker_circle')} className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 transition-colors uppercase text-[9px] tracking-wider">
              <Circle size={16} strokeWidth={2} /> Círculo
            </button>
            <button onClick={() => addMarker('marker_line')} className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 transition-colors uppercase text-[9px] tracking-wider">
              <Minus size={16} strokeWidth={3} /> Linha
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Fase Atual</h2>
          <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700 w-full mb-1">
            <button 
              onClick={() => { setActiveStep(0); setIsPlaying(false); }}
              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-full transition-all ${activeStep === 0 ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Design
            </button>
            <button 
              onClick={() => { setActiveStep(1); setIsPlaying(false); }}
              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-full transition-all ${activeStep > 0 ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Animação
            </button>
          </div>

          {activeStep > 0 && (
            <div className="flex items-center gap-2 mt-3 bg-slate-800/50 p-2 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-500 uppercase font-bold ml-1">Passo:</span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {Array.from({length: maxSteps}).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => { setActiveStep(i + 1); setIsPlaying(false); }}
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors shadow-sm ${activeStep === i + 1 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={addMovementStep}
                  className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center bg-slate-700/50 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-slate-600 border-dashed"
                  title="Adicionar passo de animação"
                >
                  +
                </button>
              </div>
              {maxSteps > 1 && (
                <button 
                  onClick={removeMovementStep}
                  className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors ml-auto"
                  title="Remover último passo"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[32px]">
            {activeStep === 0 
              ? 'Arraste as peças para definir as posições iniciais.' 
              : 'Arraste as peças para desenhar a rota neste passo de animação.'}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 space-y-4 lg:mt-auto mt-6">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ações</h3>
          <button 
            onClick={() => {
              setIsPlaying(!isPlaying);
            }}
            disabled={entities.length === 0}
            className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20 text-[10px] uppercase tracking-wider
              ${entities.length === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' :
                isPlaying ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-emerald-500 text-white'
              }`}
          >
            {isPlaying ? <RotateCcw size={14} /> : <Play size={14} />}
            {isPlaying ? 'Parar' : 'Play'}
          </button>
          
          {(() => {
            if (!selectedId) return null;
            const selectedEntity = entities.find(e => e.id === selectedId);
            if (!selectedEntity || !selectedEntity.type.startsWith('marker')) return null;
            return (
              <div className="pt-2 pb-1 border-t border-slate-700/50">
                <span className="text-[10px] text-slate-400 block px-1 leading-tight">Use os pontos na marcação para redimensionar e girar.</span>
              </div>
            );
          })()}
          <div className="h-9">
            {selectedId ? (
              <button 
                onClick={() => {
                  setEntities(prev => prev.filter(e => e.id !== selectedId));
                  setSelectedId(null);
                }} 
                className="w-full h-full flex items-center justify-center gap-2 text-[10px] font-bold text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-rose-500/30 uppercase tracking-wider"
              >
                <Trash2 size={12} /> Remover
              </button>
            ) : null}
          </div>

          <button 
            onClick={clearBoard}
            className="w-full py-1 text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors"
          >
            Limpar Quadro
          </button>
          
          <div className="flex gap-2">
             <button 
               onClick={() => setIsSaveModalOpen(true)}
               disabled={entities.length === 0}
               className={`flex-1 py-2 text-[10px] font-bold uppercase transition-colors rounded-lg border shadow-sm flex items-center justify-center gap-2
                 ${entities.length === 0 ? 'bg-slate-800 text-slate-600 border-slate-700/50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'}
               `}
             >
               <Save size={14} /> Salvar
             </button>
             <button 
               onClick={() => setIsLoadModalOpen(true)}
               className="flex-1 py-2 text-[10px] font-bold uppercase transition-colors rounded-lg border shadow-sm flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
             >
               <FolderOpen size={14} /> Carregar
             </button>
          </div>

        </div>
      </aside>

      {/* Main Pitch Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950 @container lg:overflow-hidden min-h-[50vh]">
        
        {/* The Pitch Container */}
        <div 
          className="relative w-full aspect-[115/74] max-w-6xl max-h-full bg-emerald-900 rounded-[20px] sm:rounded-[40px] border-[6px] sm:border-[12px] border-emerald-950 overflow-hidden shadow-2xl"
        >
          <div 
            ref={pitchRef}
            className="absolute inset-0 w-full h-full touch-none"
            onPointerDown={() => setSelectedId(null)} 
          >
            <PitchMarks />

            {/* Render Movement Arrows */}
            {activeStep > 0 && !isPlaying && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                <defs>
                  <marker id="arrow-A" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#60A5FA" />
                  </marker>
                  <marker id="arrow-B" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#F87171" />
                  </marker>
                  <marker id="arrow-ball" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#FFFFFF" />
                  </marker>
                  <marker id="arrow-marker" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#FACC15" />
                  </marker>
                </defs>
                {entities.map(entity => {
                  return (
                    <g key={`lines-${entity.id}`}>
                      {entity.path.slice(0, -1).map((pt, i) => {
                        const nextPt = entity.path[i+1];
                        if (pt.x === nextPt.x && pt.y === nextPt.y) return null;
                        
                        const isActive = i === activeStep - 1;
                        const markerId = entity.type === 'ball' ? 'arrow-ball' : entity.type.startsWith('marker') ? 'arrow-marker' : `arrow-${entity.team}`;
                        const color = entity.type === 'ball' ? '#FFFFFF' : entity.type.startsWith('marker') ? '#FACC15' : entity.team === 'A' ? '#60A5FA' : '#F87171';
                        
                        return (
                          <line 
                            key={i}
                            x1={`${pt.x}%`} 
                            y1={`${pt.y}%`} 
                            x2={`${nextPt.x}%`} 
                            y2={`${nextPt.y}%`} 
                            stroke={color}
                            strokeWidth={isActive ? "3" : "2"}
                            strokeDasharray="6 6"
                            markerEnd={`url(#${markerId})`}
                            className={`transition-opacity duration-300 ${isActive ? 'opacity-80' : 'opacity-30'}`}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Render Entities */}
            {entities.map(entity => {
              const isSelected = selectedId === entity.id;
              const isDragging = dragState?.id === entity.id;
              
              return (
                <React.Fragment key={entity.id}>
                  <motion.div
                    initial={false}
                    animate={{ 
                      left: isPlaying ? entity.path.map(p => `${p.x}%`) : `${entity.path[activeStep].x}%`, 
                      top: isPlaying ? entity.path.map(p => `${p.y}%`) : `${entity.path[activeStep].y}%` 
                    }}
                    transition={{ 
                      duration: isPlaying ? maxSteps * 1.5 : (isDragging ? 0 : 0.4),
                      ease: "linear",
                      times: isPlaying ? entity.path.map((_, i) => i / maxSteps) : undefined
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? 'z-40' : 'z-30'}`}
                    onPointerDown={(e) => {
                      setSelectedId(entity.id);
                      handlePointerDown(entity.id, e);
                    }}
                    onAnimationComplete={() => {
                       if (isPlaying && entities[0]?.id === entity.id) {
                          setIsPlaying(false);
                       }
                    }}
                  >
                    {entity.type === 'ball' ? (
                      <BallPiece isSelected={isSelected} />
                    ) : entity.type.startsWith('marker') ? (
                      <MarkerPiece type={entity.type} isSelected={isSelected} w={entity.w} h={entity.h} r={entity.r} scale={entity.scale} onTransformDown={(e, action) => handleTransformDown(entity.id, e, action)} />
                    ) : (
                      <PlayerPiece entity={entity} isSelected={isSelected} />
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </main>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setIsSaveModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-white">Salvar Tática</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome da Tática</label>
                <input 
                  type="text" 
                  value={newTacticName}
                  onChange={e => setNewTacticName(e.target.value)}
                  placeholder="Ex: Saída de Bola 4-3-3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveTactic();
                    if (e.key === 'Escape') setIsSaveModalOpen(false);
                  }}
                />
              </div>
              <button 
                onClick={saveTactic}
                disabled={!newTacticName.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
            <button onClick={() => setIsLoadModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-6 text-white shrink-0 flex items-center gap-2">
              <FolderOpen size={20} className="text-emerald-500" /> Carregar Tática
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {savedTactics.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma tática salva ainda.
                </div>
              ) : (
                savedTactics.sort((a, b) => b.createdAt - a.createdAt).map(tactic => (
                  <div key={tactic.id} className="group relative flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-colors">
                    <button 
                      className="absolute inset-0 w-full h-full text-left"
                      onClick={() => loadTactic(tactic)}
                    />
                    <div className="pointer-events-none z-10 flex flex-col gap-1">
                      <span className="font-bold text-slate-200">{tactic.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {tactic.entities.length} peças • {tactic.maxSteps} {tactic.maxSteps === 1 ? 'passo' : 'passos'} • {new Date(tactic.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteTactic(tactic.id, e)}
                      className="z-10 p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Excluir tática"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
