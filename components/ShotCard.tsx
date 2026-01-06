import React, { useRef, useState } from 'react';
import { Shot, CameraMove, ShotSize, CameraAngle } from '../types';
import { CameraIcon, WandIcon, RefreshIcon, VolumeIcon, PlayIcon, ClapperboardIcon, TrashIcon } from './Icons';
import { MOCK_ASSETS } from '../data/mockAssets';

interface ShotInspectorProps {
  shot: Shot;
  onUpdate: (id: number, field: keyof Shot, value: string | number) => void;
  onGenerateImage: (id: number) => void;
  onGenerateAudio: (id: number) => void;
  onGenerateVideo: (id: number) => void;
  onOpenAssetLibrary: (shotId: number) => void;
  onDeleteShot: (id: number) => void;
}

const CAMERA_MOVES: CameraMove[] = ["Static", "Pan Left", "Pan Right", "Zoom In", "Zoom Out", "Tracking", "Shake"];
const SHOT_SIZES: ShotSize[] = ["Extreme Close-up", "Close-up", "Medium Shot", "Cowboy Shot", "Wide Shot"];
const CAMERA_ANGLES: CameraAngle[] = ["Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Overhead", "Worm's Eye"];

export const ShotInspector: React.FC<ShotInspectorProps> = ({ shot, onUpdate, onGenerateImage, onGenerateAudio, onGenerateVideo, onOpenAssetLibrary, onDeleteShot }) => {
  
  const linkedAsset = shot.audio_asset_id ? MOCK_ASSETS.find(a => a.id === shot.audio_asset_id) : null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CameraIcon className="w-4 h-4 text-orange-500" />
                    Shot {String(shot.id).padStart(2, '0')}
                </h3>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => onDeleteShot(shot.id)}
                    className="p-1.5 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete Shot"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => onGenerateImage(shot.id)}
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all shadow-lg
                        ${shot.isGeneratingImage 
                            ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                        }`}
                >
                    {shot.isGeneratingImage ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <WandIcon className="w-3 h-3" />}
                    {shot.imageUrl ? 'Re-Roll Visual' : 'Render Visual'}
                </button>
            </div>
        </div>

        {/* 0. Video / Motion Control (High Priority) */}
        {shot.imageUrl && (
            <div className="p-3 bg-gradient-to-r from-indigo-900/10 to-purple-900/10 border border-indigo-500/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                        <ClapperboardIcon className="w-3 h-3" /> Motion (Veo)
                     </span>
                     {shot.videoUrl && <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-1.5 rounded border border-emerald-500/30">GENERATED</span>}
                </div>
                
                <button
                    onClick={() => onGenerateVideo(shot.id)}
                    disabled={shot.isGeneratingVideo}
                    className={`w-full py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        shot.isGeneratingVideo 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-indigo-50 shadow-lg'
                    }`}
                >
                    {shot.isGeneratingVideo ? (
                        <>
                             <RefreshIcon className="w-3 h-3 animate-spin" /> Rendering...
                        </>
                    ) : (
                        <>
                             {shot.videoUrl ? <RefreshIcon className="w-3 h-3"/> : <PlayIcon className="w-3 h-3 fill-black" />} 
                             {shot.videoUrl ? 'Re-Generate' : 'Animate Shot'}
                        </>
                    )}
                </button>
            </div>
        )}


        {/* 1. Cinematography Control (Grouped) */}
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3 space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-2">Cinematography</span>
            
            {/* Camera Angle */}
            <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Angle</span>
                <div className="flex flex-wrap gap-1.5">
                    {CAMERA_ANGLES.map(angle => (
                        <button
                            key={angle}
                            onClick={() => onUpdate(shot.id, 'camera_angle', angle)}
                            className={`text-[9px] px-2 py-1 rounded border transition-all ${
                                shot.camera_angle === angle 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            {angle}
                        </button>
                    ))}
                </div>
            </div>

            {/* Shot Size */}
            <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Shot Size</span>
                <div className="flex flex-wrap gap-1.5">
                    {SHOT_SIZES.map(size => (
                        <button
                            key={size}
                            onClick={() => onUpdate(shot.id, 'shot_size', size)}
                            className={`text-[9px] px-2 py-1 rounded border transition-all ${
                                shot.shot_size === size 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

             {/* Camera Movement */}
            <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Movement</span>
                <div className="flex flex-wrap gap-1.5">
                    {CAMERA_MOVES.map(move => (
                        <button
                            key={move}
                            onClick={() => onUpdate(shot.id, 'camera_movement', move)}
                            className={`text-[9px] px-2 py-1 rounded border transition-all ${
                                shot.camera_movement === move 
                                ? 'bg-pink-600 border-pink-500 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            {move}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Director's Note / Reasoning */}
            {shot.camera_reasoning && (
                <div className="mt-2 p-2 bg-indigo-950/30 border-l-2 border-indigo-500 rounded-r text-[10px] text-indigo-200 italic">
                    <span className="font-bold not-italic text-indigo-400 mr-1">Director's Note:</span> 
                    {shot.camera_reasoning}
                </div>
            )}
        </div>

        {/* 2. Timing & Sound (Grouped) */}
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3 space-y-4">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-2">Timing & Sound</span>
             
             <div className="grid grid-cols-2 gap-3">
                <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Duration (s)</span>
                     <input 
                        type="number" 
                        step="0.5"
                        value={shot.duration}
                        onChange={(e) => onUpdate(shot.id, 'duration', parseFloat(e.target.value))}
                        className="w-full bg-black border border-slate-700 text-white rounded p-1.5 text-xs font-mono focus:border-indigo-500 outline-none"
                    />
                </div>
                <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">SFX Asset</span>
                     <button 
                        onClick={() => onOpenAssetLibrary(shot.id)}
                        className={`w-full text-left px-2 py-1.5 rounded border text-xs truncate flex items-center gap-2 ${
                            linkedAsset 
                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' 
                            : 'bg-black border-slate-700 text-slate-500 hover:border-slate-500'
                        }`}
                    >
                        <VolumeIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{linkedAsset ? linkedAsset.name : 'Select...'}</span>
                    </button>
                </div>
            </div>
        </div>

        {/* 3. Narrative & Prompt (Grouped) */}
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3 space-y-3">
             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Script & Prompt</span>
             </div>
             
             {/* Character Emotion (NEW) */}
             <div className="space-y-1">
                 <span className="text-[9px] text-pink-400 font-bold uppercase">Character Emotion (Acting)</span>
                 <input
                    className="w-full bg-black text-xs text-white p-2 rounded border border-pink-900/50 focus:border-pink-500 outline-none font-bold"
                    value={shot.character_emotion || ''}
                    onChange={(e) => onUpdate(shot.id, 'character_emotion', e.target.value)}
                    placeholder="e.g. Terrified scream, tears in eyes..."
                />
             </div>

             {/* Dialogue */}
             <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Dialogue</span>
                <textarea
                    className="w-full bg-black text-sm text-slate-200 p-2 rounded border border-slate-700 focus:border-indigo-500 outline-none resize-none font-serif italic"
                    value={shot.dialogue}
                    onChange={(e) => onUpdate(shot.id, 'dialogue', e.target.value)}
                    rows={2}
                    placeholder="..."
                />
             </div>
             
             {/* TTS Controls */}
             {shot.dialogue && (
                <div className="flex gap-2">
                    {shot.audioUrl ? (
                        <button 
                            onClick={handlePlayAudio}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-2 transition-all border border-slate-600"
                        >
                            <PlayIcon className="w-3 h-3" /> Play Line
                        </button>
                    ) : (
                        <button 
                            onClick={() => onGenerateAudio(shot.id)}
                            disabled={shot.isGeneratingAudio}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-2 transition-all border ${
                                shot.isGeneratingAudio 
                                ? 'bg-slate-800 text-slate-500 border-slate-700' 
                                : 'bg-transparent text-slate-400 border-slate-600 hover:bg-slate-800'
                            }`}
                        >
                            {shot.isGeneratingAudio ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <VolumeIcon className="w-3 h-3" />}
                            Generate Voice
                        </button>
                    )}
                </div>
             )}

             {/* Visual Prompt */}
             <div className="space-y-1 pt-2 border-t border-white/5">
                 <span className="text-[9px] text-slate-500 font-bold uppercase">AI Visual Description</span>
                 <textarea
                    className="w-full bg-black/50 text-[10px] text-slate-400 p-2 rounded border border-slate-800 focus:border-indigo-500/50 outline-none resize-none font-mono"
                    value={shot.visual_prompt}
                    onChange={(e) => onUpdate(shot.id, 'visual_prompt', e.target.value)}
                    rows={4}
                />
             </div>
             
             {/* Hidden Audio Element */}
             {shot.audioUrl && (
                <audio 
                    ref={audioRef} 
                    src={shot.audioUrl} 
                    onEnded={() => setIsPlaying(false)} 
                />
            )}
        </div>
    </div>
  );
};