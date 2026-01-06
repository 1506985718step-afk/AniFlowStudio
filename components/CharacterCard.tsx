import React from 'react';
import { Character } from '../types';
import { UserIcon, WandIcon, RefreshIcon } from './Icons';

interface CharacterCardProps {
  character: Character;
  index: number;
  onUpdate: (index: number, field: keyof Character, value: string) => void;
  onGeneratePortrait: (index: number) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, index, onUpdate, onGeneratePortrait }) => {
  return (
    <div className="glass-panel p-3 rounded-xl flex gap-3 hover:border-indigo-500/40 transition-colors group">
      
      {/* Avatar Section */}
      <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden relative group/avatar cursor-pointer shadow-inner">
             {character.imageUrl ? (
                 <>
                    <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center" onClick={() => onGeneratePortrait(index)}>
                        <RefreshIcon className="w-4 h-4 text-white" />
                    </div>
                 </>
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-slate-800 transition-colors" onClick={() => onGeneratePortrait(index)}>
                     {character.isGenerating ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <UserIcon className="w-6 h-6" />}
                 </div>
             )}
          </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex justify-between items-start">
             <input 
                className="bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-indigo-500 w-full"
                value={character.name}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder="Name"
             />
             <div className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 ml-2 whitespace-nowrap">
                 {character.voice_id}
             </div>
          </div>

          <input 
              className="bg-slate-900/30 text-[10px] text-slate-400 w-full p-1 rounded border border-transparent focus:border-indigo-500/30 outline-none"
              value={character.core_traits}
              onChange={(e) => onUpdate(index, 'core_traits', e.target.value)}
              placeholder="Core traits (e.g. Blue hair, Stoic)"
          />
          
          <div className="relative">
              <textarea 
                  className="w-full bg-slate-950/30 text-[9px] text-slate-500 focus:text-slate-300 p-1.5 rounded border border-slate-800 focus:border-indigo-500/40 outline-none resize-none h-10 custom-scrollbar"
                  value={character.appearance_prompt}
                  onChange={(e) => onUpdate(index, 'appearance_prompt', e.target.value)}
                  placeholder="Design Prompt (Detailed)"
              />
          </div>
      </div>
    </div>
  );
};