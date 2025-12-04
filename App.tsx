import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas, drawBird } from './components/GameCanvas';
import { GameState, SKINS, Skin } from './types';
import { getScoreCommentary } from './services/geminiService';

// Component to render a preview of the bird skin
const BirdPreview = ({ skin }: { skin: Skin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw bird at center (30, 30) with size 16
    drawBird(ctx, 30, 30, 16, 0, skin);
  }, [skin]);

  return <canvas ref={canvasRef} width={60} height={60} className="w-14 h-14" />;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentSkin, setCurrentSkin] = useState<Skin>(SKINS[0]);
  const [aiComment, setAiComment] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('fluppyHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleGameOver = async () => {
    // Save high score to local storage immediately
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('fluppyHighScore', score.toString());
    }
    
    // AI Commentary
    setLoadingAi(true);
    setAiComment('');
    const comment = await getScoreCommentary(score);
    setAiComment(comment);
    setLoadingAi(false);
  };

  const startGame = () => {
    setGameState(GameState.START);
    setScore(0);
    setAiComment('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950 font-[VT323] overflow-hidden">
      
      {/* Full Screen Game Canvas */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        score={score} 
        setScore={setScore}
        currentSkin={currentSkin}
        onGameOver={handleGameOver}
      />

      {/* Start Screen Overlay */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20 p-6 animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <h1 className="text-7xl md:text-8xl font-bold text-yellow-400 drop-shadow-[4px_4px_0_#000] tracking-wider leading-none">
              FLUPPY BIRD
            </h1>
            <p className="text-2xl md:text-3xl text-pink-500 font-bold tracking-[0.2em] mt-2 drop-shadow-[2px_2px_0_#000] animate-pulse">
              LUKAY EDITION
            </p>
          </div>

          <p className="text-xl text-white mb-8 animate-bounce">Tap Layar / Spasi untuk Lompat</p>
          
          {/* Skin Selector */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/20 mb-8 max-w-md w-full">
            <p className="text-center text-yellow-300 text-lg mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Pilih Karakter</p>
            <div className="flex justify-between gap-2 overflow-x-auto pb-2">
              {SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setCurrentSkin(skin)}
                  className={`flex flex-col items-center gap-2 transition-all duration-200 ${currentSkin.id === skin.id ? 'scale-110 opacity-100' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <div 
                    className={`rounded-xl border-4 shadow-lg flex items-center justify-center relative overflow-hidden bg-sky-300`}
                    style={{ borderColor: currentSkin.id === skin.id ? '#fff' : skin.borderColor }}
                  >
                    {/* Render actual bird graphic */}
                    <BirdPreview skin={skin} />
                  </div>
                  <span className="text-sm font-bold tracking-wider text-white shadow-black drop-shadow-md">{skin.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
              onClick={() => setGameState(GameState.PLAYING)}
              className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white text-3xl font-bold rounded-xl shadow-[0_6px_0_#15803d] active:shadow-none active:translate-y-2 transition-all w-full max-w-xs border-2 border-green-400"
            >
              START
          </button>
          
          <p className="text-cyan-400 mt-4 text-lg font-bold tracking-wide animate-pulse drop-shadow-md">
            by @luckyluqmanulhakim
          </p>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30 p-6 text-center animate-in zoom-in-95 duration-200">
          <h2 className="text-7xl font-bold text-red-500 mb-2 drop-shadow-[3px_3px_0_#000]">GAME OVER</h2>
          <p className="text-yellow-400 text-xl mb-8 tracking-widest">LUKAY EDITION</p>
          
          <div className="bg-slate-800 p-6 rounded-2xl border-4 border-slate-600 w-full max-w-xs mb-6 shadow-2xl transform rotate-1">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-400 text-2xl">Score</span>
              <span className="text-5xl text-white font-bold">{score}</span>
            </div>
            <div className="flex justify-between items-end border-t-2 border-slate-600 pt-4">
              <span className="text-yellow-500 text-2xl">Best</span>
              <span className="text-5xl text-yellow-500 font-bold">{highScore}</span>
            </div>
          </div>

          {/* AI Commentary Section */}
          <div className="mb-8 min-h-[80px] max-w-xs bg-black/30 p-4 rounded-xl border border-white/10">
            {loadingAi ? (
              <div className="flex flex-col items-center gap-2">
                 <div className="w-6 h-6 border-4 border-t-cyan-400 border-white/20 rounded-full animate-spin"></div>
                 <p className="text-slate-400 text-sm">Kami sedang menilai...</p>
              </div>
            ) : (
              <p className="text-xl text-cyan-300 italic font-serif">"{aiComment}"</p>
            )}
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={startGame}
              className="w-full px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-xl shadow-[0_6px_0_#15803d] active:shadow-none active:translate-y-2 transition-all border-2 border-green-400"
            >
              MAIN LAGI
            </button>
            <button 
              onClick={() => setGameState(GameState.START)}
              className="w-full px-8 py-3 bg-slate-600 hover:bg-slate-700 text-white text-xl font-bold rounded-xl shadow-[0_4px_0_#334155] active:shadow-none active:translate-y-1 transition-all border-2 border-slate-500"
            >
              MENU UTAMA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}