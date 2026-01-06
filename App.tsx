import React, { useState, useEffect, useRef } from 'react';
import { generateAnimeScript, generateImage, generateSpeech, generateVideoFromImage } from './services/geminiService';
import { Shot, Character, ScriptResponse, GenerationStatus, Asset, AspectRatio } from './types';
import { ShotInspector } from './components/ShotCard'; 
import { CharacterCard } from './components/CharacterCard';
import { AssetLibrary } from './components/AssetLibrary';
import { Timeline } from './components/Timeline';
import { CameraIcon, ClapperboardIcon, WandIcon, UserIcon, PlayIcon, RefreshIcon, StackIcon, MusicIcon, SettingsIcon, DownloadIcon, CheckIcon, XIcon, LayersIcon, PlusIcon } from './components/Icons';
import { CREATIVE_TEMPLATES, SHOWCASE_CLIPS, Template } from './data/templates';

// Mock data initialization for fresh start
const EMPTY_PROJECT: ScriptResponse = {
  title: "Untitled Project",
  location_visuals: "",
  projectSettings: {
    aspectRatio: "16:9",
    global_style: "Anime style, high quality, 4k"
  },
  characters: [],
  shots: []
};

type ViewMode = 'EDITOR' | 'EXPORT';

export default function App() {
  // --- Global State ---
  const [scriptData, setScriptData] = useState<ScriptResponse>(EMPTY_PROJECT);
  const [topic, setTopic] = useState<string>('');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("16:9");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('EDITOR');
  
  // --- Workbench State ---
  const [activeTab, setActiveTab] = useState<'CAST' | 'ASSETS'>('CAST');
  const [activeShotId, setActiveShotId] = useState<number | null>(null);
  
  // --- Timeline & Playback State ---
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playbackRef = useRef<number | null>(null);

  // --- Viewport Settings ---
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(true);

  // --- Asset Modal ---
  const [showAssetPanel, setShowAssetPanel] = useState(false);

  // --- Export State ---
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  
  // Sequential Player State
  const [previewShotIndex, setPreviewShotIndex] = useState(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // --- Batch Process State ---
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // --- Consistency State ---
  const [projectSeed, setProjectSeed] = useState<number>(Math.floor(Math.random() * 1000000));

  // --- Video Refs ---
  const activeVideoRef = useRef<HTMLVideoElement>(null);
  
  // --- Derived State ---
  const totalDuration = scriptData.shots.reduce((acc, s) => acc + s.duration, 0);
  const activeShotIndex = scriptData.shots.findIndex(s => s.id === activeShotId);
  const activeShot = scriptData.shots[activeShotIndex];
  const currentRatio = scriptData.projectSettings?.aspectRatio || "16:9";

  // Helper to map backend camera moves to CSS classes
  const getAnimationClass = (move: string) => {
      const map: Record<string, string> = {
          "Zoom In": "anim-Zoom-In",
          "Zoom Out": "anim-Zoom-Out",
          "Pan Left": "anim-Pan-Left",
          "Pan Right": "anim-Pan-Right",
          "Tracking": "anim-Tracking",
          "Shake": "anim-Shake",
          "Static": "anim-Static"
      };
      return map[move] || "anim-Static";
  };

  // --- Effects ---

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now() - (currentTime * 1000);
      playbackRef.current = window.setInterval(() => {
        const now = Date.now();
        const newTime = (now - startTime) / 1000;
        
        if (newTime >= totalDuration) {
          setCurrentTime(totalDuration);
          setIsPlaying(false);
          if (playbackRef.current) clearInterval(playbackRef.current);
        } else {
          setCurrentTime(newTime);
        }
      }, 50); // 20FPS update
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); }
  }, [isPlaying, totalDuration]); 

  // Sync Video Element with Global State
  useEffect(() => {
     if (activeVideoRef.current && activeShot?.videoUrl) {
         if (isPlaying) {
             activeVideoRef.current.play().catch(e => console.log("Video Play Error:", e));
         } else {
             activeVideoRef.current.pause();
         }
     }
  }, [isPlaying, activeShot?.videoUrl]);

  // Sync Active Shot with Time
  useEffect(() => {
      let accumulatedTime = 0;
      let foundShotId = null;
      
      for (const shot of scriptData.shots) {
          if (currentTime >= accumulatedTime && currentTime < accumulatedTime + shot.duration) {
              foundShotId = shot.id;
              break;
          }
          accumulatedTime += shot.duration;
      }
      
      if (isPlaying && foundShotId && foundShotId !== activeShotId) {
          setActiveShotId(foundShotId);
      }
  }, [currentTime, isPlaying, scriptData.shots]);

  // --- Keyboard Shortcuts (Space to Play) ---
  const stateRef = useRef({ currentTime, totalDuration, isPlaying, viewMode });
  
  useEffect(() => {
      stateRef.current = { currentTime, totalDuration, isPlaying, viewMode };
  }, [currentTime, totalDuration, isPlaying, viewMode]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              const target = e.target as HTMLElement;
              // Prevent triggering if typing in an input field
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
              // Prevent if in export mode
              if (stateRef.current.viewMode === 'EXPORT') return;

              e.preventDefault();
              
              const { currentTime, totalDuration, isPlaying } = stateRef.current;
              
              if (currentTime >= totalDuration - 0.1) {
                  // If near end, restart
                  setCurrentTime(0);
                  setIsPlaying(true);
              } else {
                  setIsPlaying(!isPlaying);
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Helper: Auto Generate Pipeline ---
  const scriptDataRef = useRef(scriptData);
  useEffect(() => { scriptDataRef.current = scriptData; }, [scriptData]);

  const autoGenerateImagesForScript = async (initialData: ScriptResponse) => {
      setIsBatchProcessing(true);
      
      // PHASE 1: GENERATE CHARACTER PORTRAITS (The Anchor)
      const charsToGen = initialData.characters.map((c, idx) => ({ ...c, originalIndex: idx }));
      
      setScriptData(prev => ({
          ...prev,
          characters: prev.characters.map(c => ({ ...c, isGenerating: true }))
      }));

      for (const char of charsToGen) {
           try {
               const globalStyle = initialData.projectSettings?.global_style || "Anime style";
               const portraitUrl = await generateImage(
                   `Character portrait of ${char.name}, ${char.appearance_prompt}, simple background`,
                   undefined, 
                   globalStyle, 
                   "1:1", 
                   undefined,
                   projectSeed
               );

               setScriptData(prev => {
                   const newChars = [...prev.characters];
                   newChars[char.originalIndex] = { ...newChars[char.originalIndex], imageUrl: portraitUrl, isGenerating: false };
                   return { ...prev, characters: newChars };
               });
           } catch (e) {
               console.error(`Failed to gen portrait for ${char.name}`, e);
               setScriptData(prev => {
                   const newChars = [...prev.characters];
                   newChars[char.originalIndex] = { ...newChars[char.originalIndex], isGenerating: false };
                   return { ...prev, characters: newChars };
               });
           }
      }

      await new Promise(r => setTimeout(r, 500));

      // PHASE 2: GENERATE SHOTS
      const shotsToProcess = initialData.shots.map(s => s.id);
      const locationAnchor = initialData.location_visuals;

      for (const shotId of shotsToProcess) {
          setScriptData(currentData => ({
              ...currentData,
              shots: currentData.shots.map(s => s.id === shotId ? { ...s, isGeneratingImage: true } : s)
          }));

          try {
              const currentData = scriptDataRef.current;
              const targetShot = currentData.shots.find(s => s.id === shotId);
              
              if (targetShot) {
                  const focusedChar = currentData.characters.find(c => 
                      targetShot.character_focus.includes(c.name) || c.name.includes(targetShot.character_focus)
                  );
                  const appearanceContext = focusedChar ? focusedChar.appearance_prompt : undefined;
                  const referenceImage = focusedChar ? focusedChar.imageUrl : undefined;
                  const globalStyle = currentData.projectSettings?.global_style || "Anime style, high quality";
                  const ratio = currentData.projectSettings?.aspectRatio || "16:9";

                  const imageUrl = await generateImage(
                      targetShot.visual_prompt, 
                      appearanceContext, 
                      globalStyle, 
                      ratio, 
                      referenceImage, 
                      projectSeed, 
                      locationAnchor, 
                      targetShot.shot_size, 
                      targetShot.camera_angle,
                      targetShot.character_emotion // Pass Emotion
                  );
                  
                  setScriptData(prev => ({
                      ...prev,
                      shots: prev.shots.map(s => s.id === shotId ? { ...s, imageUrl, isGeneratingImage: false } : s)
                  }));
              }
          } catch (e) {
              console.error(`Auto-gen failed for shot ${shotId}`, e);
              setScriptData(prev => ({
                  ...prev,
                  shots: prev.shots.map(s => s.id === shotId ? { ...s, isGeneratingImage: false } : s)
              }));
          }
          await new Promise(r => setTimeout(r, 500));
      }
      setIsBatchProcessing(false);
  };

  // --- Logic Handlers ---

  const handleInitialize = async () => {
    if (!topic.trim()) return;
    setStatus(GenerationStatus.LOADING);
    try {
      const data = await generateAnimeScript(topic);
      data.projectSettings = {
          ...data.projectSettings,
          aspectRatio: selectedRatio, 
          global_style: data.projectSettings?.global_style || "Anime style, high quality"
      };
      setScriptData(data);
      setStatus(GenerationStatus.SUCCESS);
      if (data.shots.length > 0) setActiveShotId(data.shots[0].id);

      autoGenerateImagesForScript(data);

    } catch (error) {
      console.error(error);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
      setTopic(template.prompt);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStatus(GenerationStatus.LOADING);
      try {
          const data = await generateAnimeScript(template.prompt);
           data.projectSettings = {
              ...data.projectSettings,
              aspectRatio: selectedRatio, 
              global_style: data.projectSettings?.global_style || "Anime style, high quality"
          };
          setScriptData(data);
          setStatus(GenerationStatus.SUCCESS);
          if (data.shots.length > 0) setActiveShotId(data.shots[0].id);
          
          autoGenerateImagesForScript(data);

      } catch (error) {
          console.error(error);
          setStatus(GenerationStatus.ERROR);
      }
  };

  // NEW: Reset Project for Demo purposes
  const handleResetProject = () => {
      if (window.confirm("Are you sure you want to start a new project? Current progress will be lost.")) {
          setScriptData(EMPTY_PROJECT);
          setTopic('');
          setStatus(GenerationStatus.IDLE);
          setProjectSeed(Math.floor(Math.random() * 1000000));
          setIsPlaying(false);
          setCurrentTime(0);
      }
  };

  const handleUpdateShot = (id: number, field: keyof Shot, value: string | number) => {
      const updatedShots = scriptData.shots.map(shot => 
          shot.id === id ? { ...shot, [field]: value } : shot
      );
      setScriptData({ ...scriptData, shots: updatedShots });
  };

  const handleAddShot = () => {
      const newShotId = Math.max(...scriptData.shots.map(s => s.id), 0) + 1;
      const newShot: Shot = {
          id: newShotId,
          scene_description: "New Scene",
          visual_prompt: "Describe the new shot here...",
          camera_movement: "Static",
          camera_angle: "Eye Level",
          shot_size: "Medium Shot",
          camera_reasoning: "",
          character_emotion: "Neutral", // Default emotion
          dialogue: "",
          character_focus: "None",
          duration: 3,
          imageUrl: undefined,
          audioUrl: undefined,
          videoUrl: undefined
      };
      setScriptData({
          ...scriptData,
          shots: [...scriptData.shots, newShot]
      });
      setActiveShotId(newShotId);
  };

  const handleDeleteShot = (id: number) => {
      if (scriptData.shots.length <= 1) {
          alert("Cannot delete the last shot.");
          return;
      }
      const newShots = scriptData.shots.filter(s => s.id !== id);
      setScriptData({ ...scriptData, shots: newShots });
      if (activeShotId === id) {
          setActiveShotId(newShots[0].id);
      }
  };

  const handleUpdateCharacter = (index: number, field: keyof Character, value: string) => {
      const updatedChars = [...scriptData.characters];
      updatedChars[index] = { ...updatedChars[index], [field]: value };
      setScriptData({ ...scriptData, characters: updatedChars });
  };

  const handleGeneratePortrait = async (index: number) => {
      const updatedChars = [...scriptData.characters];
      updatedChars[index].isGenerating = true;
      setScriptData({ ...scriptData, characters: updatedChars });

      try {
          const char = updatedChars[index];
          const globalStyle = scriptData.projectSettings?.global_style || "Anime style";
          
          const imageUrl = await generateImage(
              `Character portrait of ${char.name}, ${char.appearance_prompt}, simple background`,
              undefined,
              globalStyle,
              "1:1",
              undefined,
              projectSeed
          );
          
          const finalChars = [...scriptData.characters];
          finalChars[index] = { ...finalChars[index], imageUrl, isGenerating: false };
          setScriptData({ ...scriptData, characters: finalChars });
      } catch (error) {
          const revertedChars = [...scriptData.characters];
          revertedChars[index].isGenerating = false;
          setScriptData({ ...scriptData, characters: revertedChars });
      }
  };

  const handleGenerateShotImage = async (shotId: number) => {
      const shotsWithLoading = scriptData.shots.map(s => 
          s.id === shotId ? { ...s, isGeneratingImage: true } : s
      );
      setScriptData({ ...scriptData, shots: shotsWithLoading });

      try {
          const targetShot = scriptData.shots.find(s => s.id === shotId);
          if (!targetShot) throw new Error("Shot not found");

          const focusedChar = scriptData.characters.find(c => 
             targetShot.character_focus.includes(c.name) || c.name.includes(targetShot.character_focus)
          );

          const appearanceContext = focusedChar ? focusedChar.appearance_prompt : undefined;
          const referenceImage = focusedChar ? focusedChar.imageUrl : undefined;
          const locationAnchor = scriptData.location_visuals;
          const ratio = scriptData.projectSettings?.aspectRatio || "16:9";
          const globalStyle = scriptData.projectSettings?.global_style || "Anime style, high quality";
          
          const imageUrl = await generateImage(
              targetShot.visual_prompt, 
              appearanceContext, 
              globalStyle, 
              ratio, 
              referenceImage, 
              projectSeed,
              locationAnchor,
              targetShot.shot_size, 
              targetShot.camera_angle,
              targetShot.character_emotion // Pass Emotion
          );

          const shotsWithImage = scriptData.shots.map(s => 
            s.id === shotId ? { ...s, imageUrl, isGeneratingImage: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsWithImage });

      } catch (error) {
           const shotsReverted = scriptData.shots.map(s => 
            s.id === shotId ? { ...s, isGeneratingImage: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsReverted });
      }
  };

  const handleGenerateVideo = async (shotId: number) => {
      const shotsWithLoading = scriptData.shots.map(s => 
        s.id === shotId ? { ...s, isGeneratingVideo: true } : s
      );
      setScriptData({ ...scriptData, shots: shotsWithLoading });

      try {
          const targetShot = scriptData.shots.find(s => s.id === shotId);
          if (!targetShot) throw new Error("Shot not found");
          if (!targetShot.imageUrl) throw new Error("Image must be generated first");

          const ratio = scriptData.projectSettings?.aspectRatio || "16:9";
          
          const videoUrl = await generateVideoFromImage(
              targetShot.visual_prompt, 
              targetShot.imageUrl, 
              ratio,
              targetShot.camera_movement 
          );

          const shotsWithVideo = scriptData.shots.map(s => 
             s.id === shotId ? { ...s, videoUrl, isGeneratingVideo: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsWithVideo });

      } catch (error) {
          console.error("Video Generation Error", error);
          const shotsReverted = scriptData.shots.map(s => 
            s.id === shotId ? { ...s, isGeneratingVideo: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsReverted });
          alert("Video generation failed. Please check your API key selection.");
      }
  };

  const handleGenerateAudio = async (shotId: number) => {
      const shotsWithLoading = scriptData.shots.map(s => 
          s.id === shotId ? { ...s, isGeneratingAudio: true } : s
      );
      setScriptData({ ...scriptData, shots: shotsWithLoading });

      try {
          const targetShot = scriptData.shots.find(s => s.id === shotId);
          if (!targetShot) throw new Error("Shot not found");

          const focusedChar = scriptData.characters.find(c => 
             targetShot.character_focus.includes(c.name) || c.name.includes(targetShot.character_focus)
          );
          
          const voiceId = focusedChar ? focusedChar.voice_id : 'Kore';
          const audioUrl = await generateSpeech(targetShot.dialogue, voiceId);

          const tempAudio = new Audio(audioUrl);
          await new Promise(resolve => {
              tempAudio.addEventListener('loadedmetadata', resolve);
              setTimeout(resolve, 1000); 
          });
          
          let newDuration = targetShot.duration;
          if (tempAudio.duration && tempAudio.duration > 0.5) {
              newDuration = Math.ceil((tempAudio.duration + 0.5) * 10) / 10;
          }

          const shotsWithAudio = scriptData.shots.map(s => 
              s.id === shotId ? { ...s, audioUrl, duration: newDuration, isGeneratingAudio: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsWithAudio });

      } catch (error) {
          console.error("Audio Generation Failed", error);
          const shotsReverted = scriptData.shots.map(s => 
              s.id === shotId ? { ...s, isGeneratingAudio: false } : s
          );
          setScriptData({ ...scriptData, shots: shotsReverted });
      }
  }

  const handleBatchGenerateImages = async () => {
      if (isBatchProcessing) return;
      setIsBatchProcessing(true);
      const shotsToProcess = scriptData.shots.filter(s => !s.imageUrl);
      for (const shot of shotsToProcess) {
          await handleGenerateShotImage(shot.id);
          await new Promise(r => setTimeout(r, 500));
      }
      setIsBatchProcessing(false);
  };

  const handleBatchGenerateAudio = async () => {
       if (isBatchProcessing) return;
       setIsBatchProcessing(true);
       const shotsToProcess = scriptData.shots.filter(s => !s.audioUrl && s.dialogue);
       for (const shot of shotsToProcess) {
           await handleGenerateAudio(shot.id);
           await new Promise(r => setTimeout(r, 500));
       }
       setIsBatchProcessing(false);
  };

  const handleSelectAsset = (asset: Asset) => {
      if (activeShotId) {
          handleUpdateShot(activeShotId, 'audio_asset_id', asset.id);
      } else {
          setScriptData({
              ...scriptData,
              projectSettings: { ...scriptData.projectSettings, bgm_asset_id: asset.id }
          });
      }
      setShowAssetPanel(false);
  };

  const togglePlay = () => {
      if (currentTime >= totalDuration) setCurrentTime(0);
      setIsPlaying(!isPlaying);
  }

  const handleExportClick = () => {
      setIsPlaying(false);
      setViewMode('EXPORT');
      setIsExporting(true);
      setExportProgress(0);
      setExportLogs(["Initializing rendering engine..."]);
      
      let progress = 0;
      const interval = setInterval(() => {
          progress += Math.floor(Math.random() * 5) + 1;
          if (progress > 100) progress = 100;
          setExportProgress(progress);
          
          if (progress === 20) setExportLogs(prev => [...prev, "Stitching video clips..."]);
          if (progress === 50) setExportLogs(prev => [...prev, "Mixing audio channels..."]);
          if (progress === 70) setExportLogs(prev => [...prev, "Applying color grading (LUTs)..."]);
          if (progress === 90) setExportLogs(prev => [...prev, "Finalizing output container..."]);
          
          if (progress === 100) {
              clearInterval(interval);
              setIsExporting(false);
              setExportLogs(prev => [...prev, "Render Complete. Ready for download."]);
              setPreviewShotIndex(0);
          }
      }, 150);
  };

  const closeExport = () => {
      setViewMode('EDITOR');
      setExportProgress(0);
      setExportLogs([]);
  };

  // Sequential Preview Logic
  useEffect(() => {
    if (viewMode === 'EXPORT' && !isExporting && scriptData.shots.length > 0) {
         if (previewVideoRef.current) {
             previewVideoRef.current.currentTime = 0;
             previewVideoRef.current.play().catch(() => {});
         }
         const shot = scriptData.shots[previewShotIndex];
         const timeout = setTimeout(() => {
             setPreviewShotIndex((prev) => (prev + 1) % scriptData.shots.length);
         }, shot.duration * 1000);
         return () => clearTimeout(timeout);
    }
  }, [viewMode, isExporting, previewShotIndex, scriptData.shots]);


  // --- Render Sections ---

  // 0. Initial Loading Screen (Homepage)
  if (scriptData.shots.length === 0) {
      return (
        <div className="flex flex-col min-h-screen bg-[#020617] text-white overflow-y-auto custom-scrollbar">
             {/* Navbar */}
             <div className="w-full flex items-center justify-between px-8 py-6 max-w-[1600px] mx-auto">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <ClapperboardIcon className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">AniFlow Studio</span>
                 </div>
                 <div className="flex items-center gap-6">
                     <button 
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 text-sm text-slate-400 font-medium hover:text-white cursor-pointer transition-colors"
                     >
                         <SettingsIcon className="w-4 h-4" />
                         Settings
                     </button>
                 </div>
             </div>

             {/* Hero Section */}
             <div className="flex-1 flex flex-col items-center pt-10 pb-20 px-4">
                <div className="space-y-4 text-center mb-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-2">
                        <WandIcon className="w-3 h-3" />
                        <span>Powered by Gemini 2.5 & Veo</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] leading-tight">
                        Turn Ideas into <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Anime Reality</span>
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        The world's first automated professional anime production engine. <br/>
                        Script, Storyboard, Design, and Video — all in one click.
                    </p>
                </div>

                {/* Input Box */}
                <div className="w-full max-w-2xl glass-panel p-1 rounded-2xl shadow-2xl shadow-indigo-500/10 mb-16 relative z-10">
                    <div className="bg-[#0b1120]/90 rounded-xl overflow-hidden backdrop-blur-sm">
                        <textarea 
                            className="w-full h-32 bg-transparent text-slate-200 p-6 text-lg border-none focus:ring-0 resize-none placeholder-slate-600 font-light leading-relaxed outline-none"
                            placeholder="Describe your scene... (e.g., A cyberpunk hacker girl running from drones in a neon rainy alleyway)"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                        <div className="flex justify-between items-center px-4 py-3 bg-black/40 border-t border-white/5">
                            <div 
                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors"
                                onClick={() => setTopic(CREATIVE_TEMPLATES[Math.floor(Math.random() * CREATIVE_TEMPLATES.length)].prompt)}
                            >
                                <RefreshIcon className="w-3 h-3" />
                                <span>I'm feeling lucky</span>
                            </div>

                            <button 
                                onClick={handleInitialize}
                                disabled={status === GenerationStatus.LOADING || !topic}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all
                                    ${status === GenerationStatus.LOADING 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5'
                                    }`}
                            >
                                {status === GenerationStatus.LOADING ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <WandIcon className="w-4 h-4" /> Generate Project
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Templates Section */}
                <div className="w-full max-w-6xl mx-auto space-y-6 mb-20">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                            <StackIcon className="w-5 h-5 text-indigo-500" />
                            Start with a Template
                        </h3>
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">View All</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {CREATIVE_TEMPLATES.map((template) => (
                            <div 
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20"
                            >
                                <img src={template.imageUrl} alt={template.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40" />
                                <div className={`absolute inset-0 bg-gradient-to-t ${template.color} opacity-80 mix-blend-multiply`}></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                
                                <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1 block">{template.genre}</span>
                                    <h4 className="text-xl font-bold text-white mb-2 leading-tight">{template.title}</h4>
                                    <p className="text-xs text-slate-300 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity delay-100 leading-relaxed">
                                        {template.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 py-10 text-center border-t border-white/5 w-full">
                    <p className="text-slate-600 text-sm">© 2025 AniFlow Studio. Powered by Google Gemini.</p>
                </div>
            </div>

            {/* Settings Modal - Homepage */}
            {showSettings && (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowSettings(false)}>
                    <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-700 w-[500px] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <SettingsIcon className="w-6 h-6 text-slate-400" />
                            Project Settings
                        </h2>
                        
                        <div className="space-y-6">
                            {/* Aspect Ratio */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Frame Aspect Ratio</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setSelectedRatio("16:9")}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                            selectedRatio === "16:9" 
                                            ? 'bg-indigo-900/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="w-12 h-7 border-2 border-current rounded-sm"></div>
                                        <span className="text-xs font-bold">16:9 Landscape</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedRatio("9:16")}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                            selectedRatio === "9:16" 
                                            ? 'bg-indigo-900/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="w-7 h-12 border-2 border-current rounded-sm"></div>
                                        <span className="text-xs font-bold">9:16 Portrait</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
      );
  }

  // 1. Main NLE Interface
  return (
    <div className="h-screen w-screen bg-[#020617] text-slate-200 flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <header className="h-14 border-b border-slate-800 bg-[#020617] flex items-center justify-between px-4 shrink-0 z-50">
            <div className="flex items-center gap-4">
                <div 
                    onClick={handleResetProject}
                    className="flex items-center gap-3 cursor-pointer group" 
                    title="Reset Project"
                >
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                        <ClapperboardIcon className="text-white w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">
                            AniFlow Studio
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                             {scriptData.title || "Untitled Project"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Middle: Project Toolbar */}
            <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/5">
                 <button 
                    onClick={handleAddShot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                 >
                     <PlusIcon className="w-3 h-3" /> Add Shot
                 </button>
                 <div className="w-px h-4 bg-slate-700 mx-1"></div>
                 <button 
                    onClick={handleBatchGenerateImages}
                    disabled={isBatchProcessing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${
                         isBatchProcessing ? 'text-slate-500 cursor-not-allowed' : 'text-indigo-400 hover:bg-indigo-900/30'
                    }`}
                 >
                     <LayersIcon className="w-3 h-3" /> Render All Images
                 </button>
                 <button 
                    onClick={handleBatchGenerateAudio}
                    disabled={isBatchProcessing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${
                        isBatchProcessing ? 'text-slate-500 cursor-not-allowed' : 'text-indigo-400 hover:bg-indigo-900/30'
                    }`}
                 >
                     <MusicIcon className="w-3 h-3" /> Render All Audio
                 </button>
                 {isBatchProcessing && <span className="text-[9px] text-slate-500 animate-pulse ml-2">Processing...</span>}
            </div>

            <div className="flex items-center gap-4">
                 <button 
                    onClick={handleResetProject}
                    className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors mr-2"
                 >
                    NEW PROJECT
                 </button>
                 <button 
                    onClick={handleExportClick}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                 >
                     EXPORT VIDEO <DownloadIcon className="w-3 h-3"/>
                 </button>
            </div>
        </header>

        {/* Middle Workspace (3 Columns) */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Resource Bin (Cast & Assets) */}
            <div className="w-80 border-r border-slate-800 bg-[#0a0f1e] flex flex-col shrink-0">
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => setActiveTab('CAST')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'CAST' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Cast & Crew
                    </button>
                    <button 
                        onClick={() => setActiveTab('ASSETS')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'ASSETS' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Assets
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {activeTab === 'CAST' ? (
                        scriptData.characters.map((char, idx) => (
                            <CharacterCard 
                                key={idx} 
                                index={idx} 
                                character={char} 
                                onUpdate={handleUpdateCharacter}
                                onGeneratePortrait={handleGeneratePortrait}
                            />
                        ))
                    ) : (
                        <AssetLibrary 
                            onSelectAsset={handleSelectAsset} 
                            selectedAssetId={activeShot?.audio_asset_id}
                        />
                    )}
                </div>
            </div>

            {/* Center: Stage / Monitor */}
            <div className="flex-1 bg-[#050505] flex flex-col relative">
                {/* Viewport */}
                <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 to-[#050505] overflow-hidden">
                    {/* The Screen - Dynamically Sized based on Ratio */}
                    <div 
                        className={`relative bg-black border border-slate-800 shadow-2xl overflow-hidden group select-none transition-all duration-300
                            ${currentRatio === '9:16' 
                                ? 'aspect-[9/16] h-full max-h-[80vh]' // Vertical Mode
                                : 'aspect-video w-full max-w-4xl'      // Horizontal Mode
                            }
                        `}
                    >
                        
                        {/* Actual Content Layer */}
                        <div className="w-full h-full relative overflow-hidden bg-black">
                            {activeShot?.videoUrl ? (
                                <video 
                                    ref={activeVideoRef}
                                    src={activeShot.videoUrl}
                                    className="w-full h-full object-cover"
                                    loop 
                                    playsInline
                                    muted={false} 
                                />
                            ) : activeShot?.imageUrl ? (
                                <img 
                                    src={activeShot.imageUrl} 
                                    className={`w-full h-full object-cover cinematic-layer ${isPlaying ? getAnimationClass(activeShot.camera_movement) : ''}`}
                                    style={isPlaying ? { animationDuration: `${activeShot.duration}s` } : {}}
                                    alt="Scene" 
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                                    {activeShot?.isGeneratingImage ? (
                                        <>
                                            <RefreshIcon className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
                                            <p className="text-xs font-mono uppercase tracking-widest text-indigo-400 animate-pulse">Painting Scene...</p>
                                        </>
                                    ) : (
                                        <>
                                            <CameraIcon className="w-16 h-16 opacity-20" />
                                            <p className="text-xs font-mono uppercase tracking-widest opacity-50">No Signal / Not Rendered</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Monitor Overlays (Grid / Safe Zone) */}
                        {showGrid && (
                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50"></div>
                                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50"></div>
                            </div>
                        )}
                        
                        {showSafeZone && (
                            <div className="absolute inset-8 border border-white/10 pointer-events-none">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-white/30"></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-white/30"></div>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-1 bg-white/30"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-1 bg-white/30"></div>
                            </div>
                        )}

                        {/* Top Info Overlay */}
                        <div className="absolute top-4 left-4 flex gap-2 z-10">
                             <span className="bg-black/50 text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10 backdrop-blur-sm">
                                 REC {currentTime.toFixed(2)}s
                             </span>
                             {activeShot && (
                                <span className="bg-indigo-600/50 text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10 backdrop-blur-sm">
                                    CAM: {activeShot.camera_movement.toUpperCase()}
                                </span>
                             )}
                        </div>

                        {/* Subtitle Overlay (Simulated) */}
                        {activeShot && (
                            <div className="absolute bottom-16 left-0 right-0 text-center px-10 pointer-events-none z-10">
                                <p className="text-white text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-black" style={{textShadow: "0 0 4px black"}}>
                                    {activeShot.dialogue}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transport Controls */}
                <div className="h-12 border-t border-slate-800 bg-[#0a0f1e] flex items-center justify-between px-6 shrink-0 z-20">
                     <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setShowGrid(!showGrid)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${showGrid ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                         >
                             GRID
                         </button>
                         <button 
                            onClick={() => setShowSafeZone(!showSafeZone)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${showSafeZone ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                         >
                             SAFE
                         </button>
                     </div>

                     <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setCurrentTime(0)} className="text-slate-400 hover:text-white"><span className="text-xs">⏮</span></button>
                        <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-white text-black flex items-center justify-center transition-all">
                            {isPlaying ? <div className="w-3 h-3 bg-black rounded-sm" /> : <PlayIcon className="w-4 h-4 ml-0.5" />}
                        </button>
                        <button onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 5))} className="text-slate-400 hover:text-white"><span className="text-xs">⏭</span></button>
                     </div>
                     
                     <div className="w-20"></div> {/* Spacer for symmetry */}
                </div>
            </div>

            {/* Right: Inspector */}
            <div className="w-80 border-l border-slate-800 bg-[#0a0f1e] flex flex-col shrink-0">
                {activeShot ? (
                    <ShotInspector 
                        shot={activeShot} 
                        onUpdate={handleUpdateShot} 
                        onGenerateImage={handleGenerateShotImage}
                        onGenerateAudio={handleGenerateAudio}
                        onGenerateVideo={handleGenerateVideo}
                        onDeleteShot={handleDeleteShot}
                        onOpenAssetLibrary={() => { setActiveTab('ASSETS'); setShowAssetPanel(true); }}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs uppercase tracking-wider">
                        Select a shot to edit
                    </div>
                )}
            </div>

        </div>

        {/* Bottom: Timeline */}
        <div className="h-48 shrink-0 relative z-10">
            <Timeline 
                shots={scriptData.shots}
                currentTime={currentTime}
                totalDuration={totalDuration}
                onSeek={setCurrentTime}
                onSelectShot={setActiveShotId}
                activeShotId={activeShotId}
            />
        </div>

        {/* Asset Modal Overlay (if needed for focused selection) */}
        {showAssetPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowAssetPanel(false)}>
                <div className="bg-[#0f172a] p-6 rounded-xl border border-slate-700 w-[600px] h-[500px] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h3 className="text-white font-bold mb-4">Select Asset for Shot {activeShotId}</h3>
                    <div className="flex-1 overflow-hidden">
                        <AssetLibrary onSelectAsset={handleSelectAsset} filterType="SFX" />
                    </div>
                    <button onClick={() => setShowAssetPanel(false)} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded">Close</button>
                </div>
            </div>
        )}

        {/* --- Export View Overlay --- */}
        {viewMode === 'EXPORT' && (
            <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col font-sans">
                {/* Export Header */}
                <div className="h-14 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0a0f1e]">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
                            <DownloadIcon className="text-white w-4 h-4" />
                         </div>
                         <h1 className="text-lg font-bold text-white tracking-tight">Export & Render</h1>
                     </div>
                     <button onClick={closeExport} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                         <XIcon className="w-5 h-5 text-slate-400" />
                     </button>
                </div>

                {/* Export Body */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left: Render Queue / Terminal */}
                    <div className="w-96 border-r border-slate-800 bg-[#050505] p-6 flex flex-col gap-6">
                         
                         {/* Progress Section */}
                         <div className="space-y-3">
                             <div className="flex justify-between text-sm font-bold">
                                 <span className={isExporting ? "text-emerald-400 animate-pulse" : "text-slate-400"}>
                                     {isExporting ? "Rendering..." : "Status"}
                                 </span>
                                 <span className="text-white">{exportProgress}%</span>
                             </div>
                             <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                    style={{ width: `${exportProgress}%` }}
                                 ></div>
                             </div>
                         </div>

                         {/* Logs */}
                         <div className="flex-1 bg-[#0a0f1e] rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-400 overflow-y-auto custom-scrollbar shadow-inner">
                             {exportLogs.map((log, i) => (
                                 <div key={i} className="mb-1.5 border-l-2 border-slate-700 pl-2">
                                     <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                     <span className="text-slate-300">{log}</span>
                                 </div>
                             ))}
                             {isExporting && (
                                 <div className="animate-pulse">_</div>
                             )}
                         </div>

                         {/* Action Buttons (Only when done) */}
                         {!isExporting && exportProgress === 100 && (
                             <div className="space-y-3">
                                 <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all">
                                     <DownloadIcon className="w-4 h-4" /> Download Final Video (.mp4)
                                 </button>
                                 <div className="grid grid-cols-2 gap-3">
                                     <button className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs">
                                         Download Script (.json)
                                     </button>
                                     <button className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs">
                                         Export Assets (.zip)
                                     </button>
                                 </div>
                             </div>
                         )}
                    </div>

                    {/* Right: Preview & Assets */}
                    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-y-auto custom-scrollbar">
                        
                        {/* Final Preview Player */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Final Cut Preview</h3>
                            <div className={`aspect-video w-full max-w-4xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative group
                                ${scriptData.projectSettings?.aspectRatio === '9:16' ? 'max-w-sm' : ''}
                            `}>
                                {/* 
                                   SEQUENTIAL PLAYER LOGIC:
                                   If exporting is done, we loop through clips. 
                                   Since simple concatenation isn't possible in browser without heavy libs, 
                                   we effectively "Play" the clips one after another.
                                */}
                                {(!isExporting && exportProgress === 100 && scriptData.shots.length > 0) ? (
                                    <>
                                        {scriptData.shots[previewShotIndex].videoUrl ? (
                                             <video 
                                                ref={previewVideoRef}
                                                src={scriptData.shots[previewShotIndex].videoUrl}
                                                className="w-full h-full object-cover"
                                                autoPlay // Autoplay allowed because interaction happened
                                                playsInline
                                                muted={false} // Maybe allow sound
                                             />
                                        ) : (
                                            <div className="w-full h-full relative">
                                                <img 
                                                    src={scriptData.shots[previewShotIndex].imageUrl} 
                                                    className={`w-full h-full object-cover ${getAnimationClass(scriptData.shots[previewShotIndex].camera_movement)}`}
                                                    style={{ animationDuration: `${scriptData.shots[previewShotIndex].duration}s` }}
                                                />
                                                {/* Simulated Audio for Image-only shots */}
                                                {scriptData.shots[previewShotIndex].audioUrl && (
                                                    <audio src={scriptData.shots[previewShotIndex].audioUrl} autoPlay />
                                                )}
                                                <div className="absolute bottom-10 left-0 right-0 text-center px-4">
                                                     <p className="text-white text-xl font-bold drop-shadow-md stroke-black" style={{textShadow: "0 0 4px black"}}>{scriptData.shots[previewShotIndex].dialogue}</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Overlay Info */}
                                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded text-xs font-mono text-white border border-white/10">
                                            Shot {scriptData.shots[previewShotIndex].id} / {scriptData.shots.length}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                        {isExporting ? (
                                            <>
                                                <RefreshIcon className="w-10 h-10 animate-spin text-emerald-500" />
                                                <p className="font-mono text-sm animate-pulse">RENDERING SEQUENCE...</p>
                                            </>
                                        ) : (
                                            <>
                                                <ClapperboardIcon className="w-12 h-12 opacity-20" />
                                                <p>Waiting to render...</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shot List (Individual Downloads) */}
                        <div>
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Generated Assets</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {scriptData.shots.map((shot) => (
                                     <div key={shot.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex gap-3 group hover:border-indigo-500/50 transition-all">
                                         <div className="w-16 h-16 bg-black rounded overflow-hidden flex-shrink-0 relative">
                                             {shot.imageUrl ? (
                                                 <img src={shot.imageUrl} className="w-full h-full object-cover" />
                                             ) : (
                                                 <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">NO IMG</div>
                                             )}
                                             {shot.videoUrl && (
                                                 <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                     <PlayIcon className="w-4 h-4 text-white drop-shadow" />
                                                 </div>
                                             )}
                                         </div>
                                         <div className="flex-1 min-w-0 flex flex-col justify-between">
                                             <div>
                                                 <div className="flex justify-between items-start">
                                                     <span className="text-xs font-bold text-white block">Shot {String(shot.id).padStart(2, '0')}</span>
                                                     <div className="flex gap-1">
                                                         {shot.videoUrl && <div className="w-2 h-2 rounded-full bg-orange-500" title="Video"></div>}
                                                         {shot.audioUrl && <div className="w-2 h-2 rounded-full bg-indigo-500" title="Audio"></div>}
                                                         {shot.imageUrl && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Image"></div>}
                                                     </div>
                                                 </div>
                                                 <p className="text-[10px] text-slate-500 truncate mt-1">{shot.scene_description}</p>
                                             </div>
                                             <div className="flex gap-2 mt-2">
                                                 {shot.videoUrl ? (
                                                      <a href={shot.videoUrl} download={`shot_${shot.id}.mp4`} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                                          <DownloadIcon className="w-2.5 h-2.5" /> MP4
                                                      </a>
                                                 ) : shot.imageUrl && (
                                                     <a href={shot.imageUrl} download={`shot_${shot.id}.png`} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                                         <DownloadIcon className="w-2.5 h-2.5" /> PNG
                                                     </a>
                                                 )}
                                                 {shot.audioUrl && (
                                                     <a href={shot.audioUrl} download={`shot_${shot.id}_audio.wav`} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                                         <DownloadIcon className="w-2.5 h-2.5" /> WAV
                                                     </a>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

    </div>
  );
}