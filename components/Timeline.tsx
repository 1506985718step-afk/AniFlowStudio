import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Shot } from '../types';

interface TimelineProps {
  shots: Shot[];
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  onSelectShot: (id: number) => void;
  activeShotId: number | null;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  shots, 
  currentTime, 
  totalDuration, 
  onSeek, 
  onSelectShot, 
  activeShotId 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Pixels per second zoom level
  const PPS = 40; 
  // Extra space at the end of timeline
  const PADDING_RIGHT = 200;

  // --- Scrubber / Drag Logic ---

  const calculateTimeFromEvent = useCallback((clientX: number) => {
    if (!scrollContainerRef.current || !containerRef.current) return 0;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    
    // Calculate relative X position inside the scrollable content
    // X = (Mouse Screen X - Container Screen Left) + Scroll Offset
    const x = clientX - rect.left + scrollLeft;
    
    // Convert to time
    const time = Math.max(0, Math.min(totalDuration, x / PPS));
    return time;
  }, [totalDuration, PPS]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger if left click
    if (e.button !== 0) return;

    setIsDragging(true);
    const newTime = calculateTimeFromEvent(e.clientX);
    onSeek(newTime);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection
        const newTime = calculateTimeFromEvent(e.clientX);
        onSeek(newTime);
      }
    };

    const handleWindowMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, calculateTimeFromEvent, onSeek]);


  // --- Render ---

  // Calculated width of the timeline content
  const contentWidth = Math.max(window.innerWidth, totalDuration * PPS + PADDING_RIGHT);

  return (
    <div 
        className="h-full bg-[#050505] flex flex-col border-t border-slate-800 select-none relative group"
        ref={containerRef}
    >
      {/* 
         Timeline Header / Ruler 
         We put the MouseDown event here and on the tracks to allow grabbing from anywhere.
      */}
      <div 
        className="h-8 bg-[#0f172a] border-b border-slate-800 relative overflow-hidden z-20 cursor-col-resize"
        onMouseDown={handleMouseDown}
        ref={scrollContainerRef} // Ref attached here for scroll sync (if we split visuals) but for now mainly for structure
        style={{ overflow: 'hidden' }} // Hide scrollbar for ruler, we sync manually if needed, or just let the bottom scroll handle it? 
        // Actually, easiest approach for sync is to put ruler inside the scrollable area below, 
        // OR simply make the whole thing scroll together. Let's make the tracks scrollable and the Playhead overlay absolute.
      >
         {/* Using a synced absolute div for the ruler to match the scroll of the track area below would be complex without a shared scroll context.
             Instead, let's put the Ruler INSIDE the scroll container below, but sticky?
             For simplicity and robustness in this React version, we will make the Whole Container scrollable horizontally, 
             or sticky the left panel.
             
             Let's stick to the previous layout: Wrapper is fixed, inner `overflow-x-auto` handles everything.
          */}
      </div>

      {/* 
          Main Scrollable Area 
          Contains: Ruler (Sticky top?), Tracks, Playhead
      */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjEwMCUiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDQwIDEwMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')] bg-repeat-x cursor-default"
        onMouseDown={handleMouseDown}
      >
        <div className="h-full relative" style={{ width: contentWidth }}>
            
            {/* RULER (Placed inside scroll view to sync perfectly) */}
            <div className="absolute top-0 left-0 right-0 h-6 border-b border-slate-800/50 text-[9px] font-mono text-slate-500 pointer-events-none">
                {Array.from({ length: Math.ceil(totalDuration) + 5 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/50 pl-1 flex items-end pb-1" style={{ left: i * PPS }}>
                    {i}s
                </div>
                ))}
            </div>

            {/* TRACKS PADDING TOP (To avoid overlap with ruler) */}
            <div className="pt-8">
                
                {/* Video Track */}
                <div className="h-14 mt-2 relative flex items-center">
                    {shots.map((shot, idx) => {
                        const startTime = shots.slice(0, idx).reduce((acc, s) => acc + s.duration, 0);
                        const width = shot.duration * PPS;
                        const isActive = activeShotId === shot.id;
                        const isPassed = currentTime > (startTime + shot.duration);
                        
                        return (
                            <div 
                                key={shot.id}
                                onMouseDown={(e) => { 
                                    e.stopPropagation(); // Stop global seek drag, start shot selection
                                    onSelectShot(shot.id); 
                                    // If we want to allow dragging *starting* from a clip, we need to manually trigger the seek logic here too
                                    handleMouseDown(e); 
                                }}
                                className={`absolute top-1 bottom-1 rounded-md border text-[10px] overflow-hidden cursor-pointer transition-all group/clip
                                    ${isActive 
                                        ? 'bg-indigo-900/80 border-indigo-400 z-10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                                    }
                                `}
                                style={{ left: startTime * PPS, width: width - 2 }} 
                                title={shot.scene_description}
                            >
                                {/* Progress Fill inside Clip */}
                                <div 
                                    className="absolute top-0 bottom-0 left-0 bg-white/10 pointer-events-none" 
                                    style={{ width: isActive && currentTime > startTime ? `${((currentTime - startTime) / shot.duration) * 100}%` : (isPassed ? '100%' : '0%') }}
                                ></div>

                                <div className="p-1 flex items-center gap-2 h-full pointer-events-none">
                                    {shot.imageUrl ? (
                                        <img src={shot.imageUrl} className="h-full aspect-square object-cover rounded-sm opacity-80" />
                                    ) : (
                                        <div className="h-full aspect-square bg-slate-900 rounded-sm flex items-center justify-center text-[8px] text-slate-500">
                                            IMG
                                        </div>
                                    )}
                                    <div className="flex flex-col truncate">
                                        <span className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>Shot {shot.id}</span>
                                        <span className="text-[8px] text-slate-500 font-mono">{shot.duration}s</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Audio Track 1: Voice */}
                <div className="h-6 mt-1 relative">
                    {shots.map((shot, idx) => {
                        const startTime = shots.slice(0, idx).reduce((acc, s) => acc + s.duration, 0);
                        if (!shot.audioUrl) return null;
                        
                        return (
                            <div 
                                key={`voice-${shot.id}`}
                                className="absolute top-1 bottom-1 bg-indigo-500/80 border border-indigo-400/50 rounded-md flex items-center px-2 text-[9px] text-white truncate shadow-sm pointer-events-none"
                                style={{ left: startTime * PPS, width: (shot.duration * PPS) - 2 }}
                            >
                                <span className="truncate">🗣️ Voice</span>
                            </div>
                        )
                    })}
                </div>

                {/* Audio Track 2: SFX */}
                <div className="h-6 mt-1 relative">
                    {shots.map((shot, idx) => {
                        const startTime = shots.slice(0, idx).reduce((acc, s) => acc + s.duration, 0);
                        if (!shot.audio_asset_id && !shot.sound_effect) return null;
                        
                        return (
                            <div 
                                key={`sfx-${shot.id}`}
                                className="absolute top-1 bottom-1 bg-emerald-900/60 border border-emerald-500/30 rounded-full flex items-center px-2 text-[9px] text-emerald-400 truncate pointer-events-none"
                                style={{ left: startTime * PPS, width: (shot.duration * PPS) - 2 }}
                            >
                                <span className="truncate opacity-80">🔊 {shot.audio_asset_id || shot.sound_effect}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 
                PLAYHEAD (Global) 
                Rendered absolute on top of everything
            */}
            <div 
                className="absolute top-0 bottom-0 w-px z-50 pointer-events-none group-hover:bg-red-400 transition-colors"
                style={{ left: currentTime * PPS }}
            >
                 {/* The Line */}
                 <div className="absolute top-0 bottom-0 w-px bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                 
                 {/* The Handle (Triangle) at the top */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 drop-shadow-md"></div>
                 
                 {/* The Time Label (follows playhead) */}
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                     {currentTime.toFixed(2)}s
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};