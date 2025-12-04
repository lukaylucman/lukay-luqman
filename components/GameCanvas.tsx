import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Skin } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  currentSkin: Skin;
  onGameOver: () => void;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

const GRAVITY = 0.4; // Slightly lighter for smoother feel
const JUMP_STRENGTH = -7.5;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 110; 
const PIPE_WIDTH = 60;
const PIPE_GAP = 170;
const GROUND_HEIGHT = 22; // Thinner ground as requested

// Exported drawing function so App.tsx can use it for previews
export const drawBird = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  skin: Skin
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Body Shape
  ctx.fillStyle = skin.color;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  
  if (skin.id === 'daffa') {
     // Daffa: Slightly taller/oval (The Angry One)
     ctx.ellipse(0, 0, size, size * 0.9, 0, 0, Math.PI * 2);
  } else {
     // Lucky, Deden, Radit: Round
     ctx.arc(0, 0, size, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Eye(s)
  ctx.fillStyle = 'white';
  
  if (skin.id === 'deden') {
      // Deden (The Smart One): Big glasses look
      ctx.beginPath();
      ctx.arc(4, -6, 8, 0, Math.PI * 2); // Right eye
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(-8, -6, 6, 0, Math.PI * 2); // Left eye peeking
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'black';
      ctx.beginPath(); ctx.arc(4, -6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-8, -6, 1.5, 0, Math.PI * 2); ctx.fill();

      // Bridge of glasses
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-2, -6);
      ctx.stroke();

  } else if (skin.id === 'daffa') {
      // Daffa (The Angry One): Angry eyebrows
      ctx.beginPath();
      ctx.arc(6, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(8, -6, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrow
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(14, -8);
      ctx.stroke();

  } else {
      // Lucky & Radit: Cute large eye
      ctx.beginPath();
      ctx.arc(6, -6, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke(); // Eye border
      
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(10, -6, 3, 0, Math.PI * 2);
      ctx.fill();
  }

  // Wing
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(-6, 4, 8, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Beak
  ctx.fillStyle = '#f97316'; // Orange
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (skin.id === 'lucky') {
      // Lucky (now has Pointy beak)
      ctx.moveTo(8, 2);
      ctx.lineTo(24, 6);
      ctx.lineTo(8, 12);
  } else {
      // Normal beak
      ctx.moveTo(10, 2);
      ctx.lineTo(22, 8);
      ctx.lineTo(10, 14);
  }
  ctx.fill();
  ctx.stroke();

  // Special Accessories
  if (skin.id === 'lucky') {
      // Lucky (Now has Cool Hair / Crown)
      ctx.fillStyle = skin.borderColor;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(-5, -25);
      ctx.lineTo(0, -14);
      ctx.lineTo(5, -22);
      ctx.lineTo(10, -10);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
};

// Audio Context Helper
const getAudioContext = () => {
    return new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' });
};

// Simple Sound Synthesizer
const playJumpSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio errors
  }
};

// Explosion / Crash Sound (Jumpscare-ish)
const playCrashSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Oscillator 1: Low frequency rumble
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);
    
    gain1.gain.setValueAtTime(0.8, ctx.currentTime); // Loud volume
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Oscillator 2: High pitch screech/noise simulation
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(500, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
    
    gain2.gain.setValueAtTime(0.5, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc2.start();
    osc2.stop(ctx.currentTime + 0.3);

  } catch (e) {
    // Ignore
  }
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  score,
  setScore,
  currentSkin,
  onGameOver
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Responsive State
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Game Refs
  const birdY = useRef(window.innerHeight / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<{ x: number; topHeight: number; passed: boolean }[]>([]);
  const clouds = useRef<Cloud[]>([]);
  const frameCount = useRef(0);
  const grassOffset = useRef(0);

  // Initialize Clouds
  useEffect(() => {
    const initialClouds: Cloud[] = [];
    // Spawn 5 random clouds
    for(let i = 0; i < 5; i++) {
        initialClouds.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight * 0.4), // Top 40% only
            scale: 0.5 + Math.random() * 0.8,
            speed: 0.2 + Math.random() * 0.5 // Slower than pipes for parallax
        });
    }
    clouds.current = initialClouds;
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      // Reset bird position on resize if not playing to keep it centered
      if (gameState === GameState.START) {
        birdY.current = window.innerHeight / 2;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gameState]);

  const resetGame = useCallback(() => {
    birdY.current = dimensions.height / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
  }, [setScore, dimensions.height]);

  const jump = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      birdVelocity.current = JUMP_STRENGTH;
      playJumpSound();
    } else if (gameState === GameState.START) {
      setGameState(GameState.PLAYING);
      birdVelocity.current = JUMP_STRENGTH;
      playJumpSound();
    }
  }, [gameState, setGameState]);

  useEffect(() => {
    if (gameState === GameState.START) {
      resetGame();
    }
  }, [gameState, resetGame]);

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump]);

  const drawCloud = (ctx: CanvasRenderingContext2D, cloud: Cloud) => {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      
      // Fluffy cloud shape
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, -10, 35, 0, Math.PI * 2);
      ctx.arc(50, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, 10, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
  };

  const update = useCallback((canvas: HTMLCanvasElement) => {
    // Always update clouds for background life
    clouds.current.forEach(cloud => {
        cloud.x -= cloud.speed;
        // Wrap around
        if (cloud.x < -150) {
            cloud.x = canvas.width + 100;
            cloud.y = Math.random() * (canvas.height * 0.4);
        }
    });

    if (gameState === GameState.PLAYING) {
        // Move grass
        grassOffset.current -= PIPE_SPEED;
        if (grassOffset.current <= -20) {
            grassOffset.current = 0;
        }
    }

    if (gameState !== GameState.PLAYING) return;

    // Physics
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Pipe Spawning
    frameCount.current++;
    if (frameCount.current % PIPE_SPAWN_RATE === 0) {
      const minHeight = 100;
      const maxHeight = canvas.height - PIPE_GAP - 100 - GROUND_HEIGHT; // Account for ground
      const randomHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
      pipes.current.push({
        x: canvas.width,
        topHeight: randomHeight,
        passed: false
      });
    }

    // Pipe Movement
    pipes.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
    });

    // Clean up pipes
    if (pipes.current.length > 0 && pipes.current[0].x < -PIPE_WIDTH) {
      pipes.current.shift();
    }

    // Collision Box (Smaller than visual for fairness)
    const birdX = dimensions.width / 2 - 50;
    const birdRadius = 14; 
    
    // Floor/Ceiling
    if (birdY.current + birdRadius > canvas.height - GROUND_HEIGHT || birdY.current - birdRadius < 0) {
      playCrashSound();
      setGameState(GameState.GAME_OVER);
      onGameOver();
      return;
    }

    // Pipes
    pipes.current.forEach(pipe => {
      // Score
      if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
        pipe.passed = true;
        setScore(prev => prev + 1);
      }

      // Hit detection (AABB logic)
      if (
        birdX + birdRadius > pipe.x &&
        birdX - birdRadius < pipe.x + PIPE_WIDTH &&
        (birdY.current - birdRadius < pipe.topHeight || birdY.current + birdRadius > pipe.topHeight + PIPE_GAP)
      ) {
        playCrashSound();
        setGameState(GameState.GAME_OVER);
        onGameOver();
      }
    });

  }, [gameState, onGameOver, setGameState, setScore, dimensions]);

  const draw = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#38bdf8'); // Sky blue
    gradient.addColorStop(1, '#bae6fd'); // Light blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cityscape / Mountains background (Parallax illusion essentially)
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50 - GROUND_HEIGHT);
    for(let i=0; i<canvas.width; i+= 100) {
        ctx.lineTo(i + 50, canvas.height - 150 - GROUND_HEIGHT);
        ctx.lineTo(i + 100, canvas.height - 50 - GROUND_HEIGHT);
    }
    ctx.fill();

    // Draw Clouds (Behind pipes)
    clouds.current.forEach(cloud => drawCloud(ctx, cloud));

    // Pipes
    pipes.current.forEach(pipe => {
      const gradientPipe = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      gradientPipe.addColorStop(0, '#4ade80');
      gradientPipe.addColorStop(0.5, '#86efac');
      gradientPipe.addColorStop(1, '#22c55e');

      ctx.fillStyle = gradientPipe;
      ctx.strokeStyle = '#14532d'; // Dark Green
      ctx.lineWidth = 3;

      // Top Pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x, -2, PIPE_WIDTH, pipe.topHeight);
      
      // Bottom Pipe
      const bottomY = pipe.topHeight + PIPE_GAP;
      const bottomPipeHeight = canvas.height - bottomY - GROUND_HEIGHT + 10; // Overlap slightly with ground
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomPipeHeight);
      ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomPipeHeight);

      // Pipe Caps (The "Tihang" look)
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(pipe.x - 4, pipe.topHeight - 24, PIPE_WIDTH + 8, 24);
      ctx.strokeRect(pipe.x - 4, pipe.topHeight - 24, PIPE_WIDTH + 8, 24);
      
      ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 24);
      ctx.strokeRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 24);
    });

    // Floor Background (Sand/Soil)
    const floorY = canvas.height - GROUND_HEIGHT;
    ctx.fillStyle = '#fde047'; // Sand
    ctx.fillRect(0, floorY, canvas.width, GROUND_HEIGHT);
    
    // Top border of floor
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.stroke();

    // Realistic Grass Texture (Moving)
    ctx.fillStyle = '#4ade80'; // Grass green base color
    ctx.strokeStyle = '#16a34a'; // Darker green outline
    ctx.lineWidth = 1;

    ctx.beginPath();
    const bladeWidth = 8;
    
    ctx.moveTo(0, floorY + 10); // Start below ground to fill
    
    // Start drawing well to the left of 0 to accommodate scrolling
    for (let i = -50; i < canvas.width + 50; i += bladeWidth) {
        const x = i + grassOffset.current;
        
        // Randomize height based on 'i' (world position index) so it moves with the ground
        // We use Math.sin(i) to make it deterministic for that patch of ground
        const seed = Math.sin(i * 0.5) * 1000; 
        const randomHeight = 8 + (Math.abs(seed) % 12); // Height between 8 and 20
        
        // Tip of grass
        ctx.lineTo(x + bladeWidth / 2, floorY - randomHeight);
        // Base of next grass
        ctx.lineTo(x + bladeWidth, floorY);
    }
    
    ctx.lineTo(canvas.width, floorY + 10);
    ctx.lineTo(0, floorY + 10);
    ctx.fill();
    ctx.stroke();

    // Draw Bird using exported function
    const birdX = dimensions.width / 2 - 50;
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdVelocity.current * 0.1)));
    drawBird(ctx, birdX, birdY.current, 18, rotation, currentSkin);

    // Score (In-game)
    if (gameState === GameState.PLAYING) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = 'bold 60px VT323';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic'; // Reset baseline for score
        ctx.strokeText(score.toString(), canvas.width / 2, 100);
        ctx.fillText(score.toString(), canvas.width / 2, 100);
    }

  }, [currentSkin, score, gameState, dimensions]);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      update(canvas);
      draw(canvas);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [draw, update]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <div className="w-full h-full" onClick={jump}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block touch-none"
      />
    </div>
  );
};