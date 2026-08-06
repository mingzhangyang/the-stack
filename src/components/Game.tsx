import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickData, CONTAINER_SIZE, STICK_LENGTH, STICK_WIDTH, doSticksOverlap } from '../utils/math';
import { playWoodClick, playErrorSound, playWinSound } from '../utils/audio';
import { RefreshCcw, Heart, HeartCrack, Trophy } from 'lucide-react';

const COLORS = [
  '#DDBB99',
  '#C19A6B',
  '#8E9775',
  '#5D4037',
  '#E2B49A',
  '#EE8877',
];

const STICK_COUNT = 30;
const MAX_LIVES = 3;

export default function Game() {
  const [sticks, setSticks] = useState<StickData[]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [errorStickId, setErrorStickId] = useState<string | null>(null);
  const [highlightStickIds, setHighlightStickIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [rotation, setRotation] = useState({ x: 55, z: 35 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rotX: 0, rotZ: 0, dragged: false });

  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('pickup_sticks_best_time');
    return saved ? parseInt(saved, 10) : null;
  });

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Responsive scaling to fit the fixed 600x600 board into any smaller screen width
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
       if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          const minScale = Math.min(width / CONTAINER_SIZE, height / CONTAINER_SIZE);
          setScale(minScale * 1.2); // Increased scale to make sticks larger
       }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const initGame = () => {
    const newSticks: StickData[] = [];
    for (let i = 0; i < STICK_COUNT; i++) {
      newSticks.push({
        id: `stick-${i}-${Date.now()}`,
        // Distribute sticks around the center of the 600x600 container
        x: CONTAINER_SIZE / 2 + (Math.random() - 0.5) * 350,
        y: CONTAINER_SIZE / 2 + (Math.random() - 0.5) * 350,
        rotation: Math.random() * Math.PI,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        zIndex: i + 1,
        removed: false,
      });
    }
    setSticks(newSticks);
    setLives(MAX_LIVES);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setErrorStickId(null);
    setHighlightStickIds([]);
    setStartTime(null);
    setCurrentTime(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (startTime && !gameOver && !won) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    }
    return () => clearInterval(interval);
  }, [startTime, gameOver, won]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!is3DView) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: rotation.x,
      rotZ: rotation.z,
      dragged: false
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !is3DView) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStartRef.current.dragged = true;
    }

    setRotation({
      x: Math.max(0, Math.min(85, dragStartRef.current.rotX - dy * 0.5)),
      z: dragStartRef.current.rotZ - dx * 0.5
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleStickClick = (clickedStick: StickData) => {
    if (gameOver || won || clickedStick.removed || isProcessing) return;
    if (is3DView && dragStartRef.current.dragged) {
      dragStartRef.current.dragged = false;
      return;
    }
    if (!startTime) {
      setStartTime(Date.now());
    }

    // A stick is blocked if any unremoved stick with a higher zIndex overlaps it
    const activeSticks = sticks.filter(s => !s.removed);
    const higherSticks = activeSticks.filter(s => s.zIndex > clickedStick.zIndex);
    const overlappingSticks = higherSticks.filter(s => doSticksOverlap(clickedStick, s));

    if (overlappingSticks.length > 0) {
      // Error! Touched another stick
      playErrorSound();
      setIsProcessing(true);
      setErrorStickId(clickedStick.id);
      setHighlightStickIds(overlappingSticks.map(s => s.id));
      
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        setTimeout(() => setGameOver(true), 800);
      }

      // Reset error state after shake animation
      setTimeout(() => {
        setErrorStickId(null);
        setHighlightStickIds([]);
        setIsProcessing(false);
      }, 800);
    } else {
      // Success! Stick is cleanly removed
      playWoodClick();
      setSticks(prev => prev.map(s => s.id === clickedStick.id ? { ...s, removed: true } : s));
      const newScore = score + 1;
      setScore(newScore);
      
      if (newScore === STICK_COUNT) {
        setWon(true);
        playWinSound();
        const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
        setCurrentTime(finalTime);
        if (bestTime === null || finalTime < bestTime) {
           setBestTime(finalTime);
           localStorage.setItem('pickup_sticks_best_time', finalTime.toString());
        }
      }
    }
  };

  return (
    <div className="h-screen w-full bg-[#F2F0E9] text-[#2D2926] font-serif overflow-hidden flex flex-col relative selection:bg-transparent">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
      
      {/* Aesthetics Overlays */}
      <div className="absolute top-0 right-0 p-8 hidden md:block z-10 pointer-events-none">
        <div className="w-24 h-px bg-black/10"></div>
        <div className="w-12 h-px bg-black/10 mt-2"></div>
      </div>

      {/* Top Navigation / HUD */}
      <header className="p-6 md:p-12 flex justify-between items-start z-20 shrink-0 pointer-events-none">
        <div className="space-y-1">
          <h1 className="text-4xl tracking-tighter uppercase font-light">The Stack</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-sans opacity-60">Steady Hand / High Precision</p>
        </div>
        
        <div className="flex gap-6 md:gap-16 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-sans">Time</p>
            <p className="text-3xl font-light">{formatTime(currentTime)}</p>
            {bestTime !== null && (
              <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1 font-sans">Best: {formatTime(bestTime)}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-sans">Current Score</p>
            <p className="text-3xl font-light">{score}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-sans">Lives</p>
            <div className="flex gap-1 mt-1 justify-end h-[36px] items-center">
               {Array.from({ length: MAX_LIVES }).map((_, i) => (
                 i < lives 
                  ? <Heart key={i} className="w-5 h-5 fill-[#2D2926] text-[#2D2926]" />
                  : <HeartCrack key={i} className="w-5 h-5 text-black/20" />
               ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Field */}
      <main 
        className="flex-1 relative flex items-center justify-center min-h-0 w-full" 
        ref={containerRef} 
        style={{ perspective: '1200px', cursor: is3DView ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* The 'Table' Shadows */}
        <div className="absolute w-96 h-96 bg-black/5 rounded-full blur-3xl pointer-events-none"></div>

        <div 
          className="relative z-10"
          style={{ 
            width: CONTAINER_SIZE, 
            height: CONTAINER_SIZE,
            transform: `scale(${scale}) ${is3DView ? `rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg)` : 'rotateX(0deg) rotateZ(0deg)'}`,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <AnimatePresence>
              {sticks.map(stick => !stick.removed && (
                  <Stick 
                    key={stick.id}
                    stick={stick}
                    isError={errorStickId === stick.id}
                    isHighlighted={highlightStickIds.includes(stick.id)}
                    onClick={() => handleStickClick(stick)}
                    disabled={gameOver || won || isProcessing}
                  />
              ))}
          </AnimatePresence>
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {(gameOver || won) && (
             <motion.div 
               initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
               animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-[#F2F0E9]/80 flex flex-col items-center justify-center z-50"
             >
                <motion.div 
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-transparent flex flex-col items-center text-center max-w-[80%]"
                >
                   {won ? (
                     <>
                        <Trophy className="w-16 h-16 text-[#DDBB99] mb-4" />
                        <h2 className="text-4xl tracking-tighter uppercase font-light mb-2 text-[#2D2926]">Magnificent</h2>
                        <p className="text-xs uppercase tracking-[0.2em] font-sans opacity-60 mb-8 text-[#2D2926]">You cleared the stack</p>
                     </>
                   ) : (
                     <>
                        <HeartCrack className="w-16 h-16 text-[#2D2926] mb-4" />
                        <h2 className="text-4xl tracking-tighter uppercase font-light mb-2 text-[#2D2926]">Game Over</h2>
                        <p className="text-xs uppercase tracking-[0.2em] font-sans opacity-60 mb-8 text-[#2D2926]">Tension disrupted</p>
                     </>
                   )}
                   
                   <button 
                     onClick={initGame}
                     className="px-8 py-4 border border-[#2D2926] bg-transparent hover:bg-[#2D2926] hover:text-[#F2F0E9] transition-colors duration-300 text-xs uppercase tracking-widest font-sans flex items-center gap-2 text-[#2D2926] cursor-pointer pointer-events-auto"
                   >
                     <RefreshCcw className="w-4 h-4" />
                     Restart
                   </button>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Bottom Controls / Footer */}
      <footer className="p-6 md:p-12 flex justify-between items-end z-20 shrink-0 pointer-events-none">
        <div className="max-w-xs hidden md:block">
          <p className="text-xs leading-relaxed opacity-60 font-sans uppercase tracking-wider">
            Lift the highlighted wood without disturbing the arrangement. Tension increases with every movement.
          </p>
        </div>
        
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
          <div className="flex -space-x-2 hidden sm:flex">
            {COLORS.slice(0, 4).map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#F2F0E9]" style={{ backgroundColor: c }}></div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-[#F2F0E9] bg-black/5 flex items-center justify-center text-[10px] font-sans text-[#2D2926]">+{COLORS.length - 4}</div>
          </div>
          
          <div className="flex gap-4 pointer-events-auto">
            <button 
              onClick={() => setIs3DView(!is3DView)} 
              className="px-6 py-4 border border-[#2D2926] bg-transparent hover:bg-[#2D2926] hover:text-[#F2F0E9] transition-colors duration-300 text-xs uppercase tracking-widest font-sans whitespace-nowrap cursor-pointer"
            >
              {is3DView ? 'Top View' : '3D View'}
            </button>
            <button 
              onClick={initGame} 
              className="px-8 py-4 border border-[#2D2926] bg-[#2D2926] text-[#F2F0E9] hover:bg-transparent hover:text-[#2D2926] transition-colors duration-300 text-xs uppercase tracking-widest font-sans whitespace-nowrap cursor-pointer"
            >
              Release Hand
            </button>
          </div>
        </div>
      </footer>

      {/* Left Side Label */}
      <div className="absolute left-8 md:left-12 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 hidden xl:flex items-center gap-4 opacity-30 pointer-events-none">
        <div className="h-12 w-px bg-current"></div>
        <p className="text-[10px] uppercase tracking-[0.4em] font-sans">Precision Coefficient 0.942</p>
      </div>
    </div>
  );
}

function Stick({ stick, isError, isHighlighted, onClick, disabled }: {
  stick: StickData;
  isError: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  disabled: boolean;
  key?: string | number;
}) {
  return (
    // Wrapper positions the element precisely at (x, y) with zIndex.
    <div 
      className="absolute" 
      style={{ 
        left: stick.x, 
        top: stick.y, 
        zIndex: stick.zIndex,
        transform: `translateZ(${stick.zIndex * 4}px)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <motion.div
        onClick={disabled ? undefined : onClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          rotate: stick.rotation * (180 / Math.PI),
          x: isError ? [0, -10, 10, -10, 10, 0] : 0, 
          filter: isHighlighted 
            // Highlight overlapping sticks in glowing red when blocked
            ? 'brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(5) drop-shadow(0 0 12px rgba(220,38,38,0.8))' 
            : 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
        }}
        exit={{ 
          scale: 1.2, 
          opacity: 0, 
          y: -100, 
          transition: { duration: 0.4, ease: 'easeOut' }
        }}
        transition={{ 
          scale: { delay: stick.zIndex * 0.015, type: 'spring', stiffness: 200, damping: 20 },
          opacity: { delay: stick.zIndex * 0.015 },
          x: { duration: 0.4 },
          default: { type: 'spring', stiffness: 200, damping: 20 }
        }}
        className="cursor-pointer select-none rounded-full absolute"
        style={{
          width: STICK_LENGTH,
          height: STICK_WIDTH,
          // Offset by -50% to perfectly align the capsule center with the wrapper
          left: -STICK_LENGTH / 2, 
          top: -STICK_WIDTH / 2,
          backgroundColor: stick.color,
          // 3D pill/wood reflection effect
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
        }}
        whileHover={{
           scale: disabled ? 1 : 1.05,
           boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 0 12px rgba(255,255,255,0.5)'
        }}
        whileTap={{
           scale: disabled ? 1 : 0.95
        }}
      />
    </div>
  );
}
