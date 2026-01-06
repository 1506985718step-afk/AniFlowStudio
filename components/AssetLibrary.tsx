import React, { useState, useRef } from 'react';
import { Asset, AssetType } from '../types';
import { MOCK_ASSETS } from '../data/mockAssets';
import { MusicIcon, VolumeIcon, StackIcon, PlayIcon } from './Icons';

interface AssetLibraryProps {
  onSelectAsset: (asset: Asset) => void;
  selectedAssetId?: string;
  filterType?: AssetType; // If provided, only shows this type
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ onSelectAsset, selectedAssetId, filterType }) => {
  const [activeTab, setActiveTab] = useState<AssetType>(filterType || 'BGM');
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredAssets = MOCK_ASSETS.filter(a => a.type === activeTab);

  const handlePlay = (asset: Asset) => {
    if (playingAssetId === asset.id) {
      audioRef.current?.pause();
      setPlayingAssetId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = asset.url;
        audioRef.current.play();
        setPlayingAssetId(asset.id);
      }
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full max-h-[600px] shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
             <h3 className="text-white font-bold flex items-center gap-2">
                <StackIcon className="text-indigo-400 w-5 h-5" /> 
                <span className="text-lg tracking-tight">Asset Studio</span>
            </h3>
        </div>
        
        <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800">
          {(['BGM', 'SFX', 'OVERLAY'] as AssetType[]).map(type => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === type 
                  ? 'bg-slate-800 text-indigo-400 shadow-lg border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
               {type === 'BGM' && <MusicIcon className="w-3 h-3" />}
               {type === 'SFX' && <VolumeIcon className="w-3 h-3" />}
               {type === 'OVERLAY' && <StackIcon className="w-3 h-3" />}
               {type}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1 bg-slate-900/50">
         {filteredAssets.map(asset => (
             <div 
                key={asset.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${selectedAssetId === asset.id ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-600'}`}
             >
                <button 
                    onClick={() => handlePlay(asset)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        playingAssetId === asset.id 
                        ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                    }`}
                >
                    {playingAssetId === asset.id ? (
                        <div className="flex gap-0.5 items-end h-3">
                            <div className="w-0.5 h-3 bg-white animate-[pulse_0.5s_ease-in-out_infinite]"></div>
                            <div className="w-0.5 h-2 bg-white animate-[pulse_0.7s_ease-in-out_infinite]"></div>
                            <div className="w-0.5 h-3 bg-white animate-[pulse_0.6s_ease-in-out_infinite]"></div>
                        </div>
                    ) : (
                        <PlayIcon className="w-4 h-4 ml-0.5" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedAssetId === asset.id ? 'text-indigo-300' : 'text-slate-200'}`}>{asset.name}</p>
                    <div className="flex gap-2 mt-1.5">
                        {asset.tags.map(tag => (
                            <span key={tag} className="text-[9px] uppercase tracking-wider font-bold bg-black/40 text-slate-500 px-1.5 py-0.5 rounded border border-white/5">{tag}</span>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => onSelectAsset(asset)}
                    className={`text-xs px-4 py-2 rounded font-bold transition-all shadow-lg ${
                        selectedAssetId === asset.id 
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                        : 'bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-500/20'
                    }`}
                >
                    {selectedAssetId === asset.id ? 'ACTIVE' : 'SELECT'}
                </button>
             </div>
         ))}
      </div>
      
      {/* Hidden Audio Player */}
      <audio ref={audioRef} onEnded={() => setPlayingAssetId(null)} className="hidden" />
    </div>
  );
};