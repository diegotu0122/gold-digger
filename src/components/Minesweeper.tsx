import React, { useState, useEffect, useCallback } from 'react';
import { Flag, Bomb, RefreshCw, Trophy, Skull, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

const CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export const Minesweeper: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'idle'>('idle');
  const [minesLeft, setMinesLeft] = useState(0);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const initGame = useCallback((diff: Difficulty = difficulty) => {
    const { rows, cols, mines } = CONFIGS[diff];
    const newGrid: Cell[][] = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      }))
    );

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!newGrid[r][c].isMine) {
        newGrid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].isMine) {
                count++;
              }
            }
          }
          newGrid[r][c].neighborMines = count;
        }
      }
    }

    setGrid(newGrid);
    setGameState('idle');
    setMinesLeft(mines);
    setTime(0);
    setTimerActive(false);
  }, [difficulty]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let interval: any;
    if (timerActive && gameState === 'playing') {
      interval = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameState]);

  const revealCell = (r: number, c: number) => {
    if (gameState === 'won' || gameState === 'lost' || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

    if (gameState === 'idle') {
      setGameState('playing');
      setTimerActive(true);
    }

    const newGrid = [...grid.map(row => [...row])];
    
    if (newGrid[r][c].isMine) {
      // Game Over
      newGrid[r][c].isRevealed = true;
      setGrid(newGrid);
      setGameState('lost');
      setTimerActive(false);
      revealAllMines(newGrid);
      return;
    }

    const floodFill = (row: number, col: number) => {
      if (row < 0 || row >= newGrid.length || col < 0 || col >= newGrid[0].length || newGrid[row][col].isRevealed || newGrid[row][col].isFlagged) return;
      
      newGrid[row][col].isRevealed = true;
      
      if (newGrid[row][col].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            floodFill(row + dr, col + dc);
          }
        }
      }
    };

    floodFill(r, c);
    setGrid(newGrid);
    checkWin(newGrid);
  };

  const revealAllMines = (currentGrid: Cell[][]) => {
    const newGrid = currentGrid.map(row => row.map(cell => ({
      ...cell,
      isRevealed: cell.isMine ? true : cell.isRevealed
    })));
    setGrid(newGrid);
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost' || grid[r][c].isRevealed) return;

    const newGrid = [...grid.map(row => [...row])];
    const isFlagged = !newGrid[r][c].isFlagged;
    newGrid[r][c].isFlagged = isFlagged;
    setGrid(newGrid);
    setMinesLeft(prev => isFlagged ? prev - 1 : prev + 1);
  };

  const checkWin = (currentGrid: Cell[][]) => {
    const { rows, cols, mines } = CONFIGS[difficulty];
    let revealedCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentGrid[r][c].isRevealed) revealedCount++;
      }
    }

    if (revealedCount === rows * cols - mines) {
      setGameState('won');
      setTimerActive(false);
    }
  };

  const getNumberColor = (num: number) => {
    const colors = [
      '', 'text-cyan-400', 'text-lime-400', 'text-rose-500', 
      'text-fuchsia-500', 'text-orange-500', 'text-emerald-400', 
      'text-white', 'text-zinc-400'
    ];
    return colors[num] || '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-pixel relative overflow-hidden">
      {/* Background Scanlines */}
      <div className="absolute inset-0 scanlines z-10 pointer-events-none opacity-30"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111] p-6 arcade-border shadow-[0_0_50px_rgba(255,215,0,0.2)] z-20 relative"
      >
        {/* Arcade Header */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex items-center justify-between border-b-4 border-[#ffd700] pb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#ffd700] text-[10px] uppercase">Mines</span>
              <div className="bg-black p-2 border-2 border-[#333]">
                <span className="text-[#ff0000] text-2xl neon-text-red font-mono">
                  {minesLeft.toString().padStart(3, '0')}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#ffd700] text-[12px] mb-2 flicker">STAGE 1</span>
              <button
                onClick={() => initGame()}
                className="w-14 h-14 bg-[#222] border-4 border-[#ffd700] flex items-center justify-center hover:bg-[#333] active:scale-95 transition-all shadow-[0_0_10px_rgba(255,215,0,0.5)]"
              >
                {gameState === 'won' ? '🏆' : gameState === 'lost' ? '💀' : '🔥'}
              </button>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <span className="text-[#ffd700] text-[10px] uppercase">Time</span>
              <div className="bg-black p-2 border-2 border-[#333]">
                <span className="text-[#ff0000] text-2xl neon-text-red font-mono">
                  {time.toString().padStart(3, '0')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); initGame(d); }}
                className={`px-4 py-2 text-[10px] uppercase transition-all border-2 ${
                  difficulty === d 
                    ? 'bg-[#ffd700] text-black border-[#fff]' 
                    : 'bg-black text-[#ffd700] border-[#ffd700] hover:bg-[#222]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Arcade Grid */}
        <div className="bg-[#000] p-2 border-4 border-[#333] shadow-inner">
          <div 
            className="grid gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${CONFIGS[difficulty].cols}, minmax(0, 1fr))`,
              width: 'fit-content'
            }}
          >
            {grid.map((row, r) => (
              row.map((cell, c) => (
                <motion.div
                  key={`${r}-${c}`}
                  whileHover={!cell.isRevealed ? { backgroundColor: '#333' } : {}}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                  className={`
                    w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer select-none transition-colors
                    ${cell.isRevealed 
                      ? 'arcade-cell-revealed' 
                      : 'arcade-cell'
                    }
                    ${cell.isRevealed && cell.isMine ? 'bg-[#ff0000] border-[#ff4444]' : ''}
                  `}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb size={18} className="text-white fill-white animate-pulse" />
                    ) : (
                      cell.neighborMines > 0 ? (
                        <span className={`text-sm font-bold neon-text-yellow ${getNumberColor(cell.neighborMines)}`}>
                          {cell.neighborMines}
                        </span>
                      ) : null
                    )
                  ) : (
                    cell.isFlagged ? (
                      <Flag size={16} className="text-[#00ffff] fill-[#00ffff] drop-shadow-[0_0_5px_#00ffff]" />
                    ) : null
                  )}
                </motion.div>
              ))
            ))}
          </div>
        </div>

        {/* Arcade Footer Messages */}
        <AnimatePresence>
          {(gameState === 'won' || gameState === 'lost' || gameState === 'idle') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              {gameState === 'idle' && (
                <div className="text-[#ffd700] text-[12px] flicker">
                  INSERT COIN TO START
                </div>
              )}
              {gameState === 'won' && (
                <div className="text-[#00ff00] text-[14px] neon-text-yellow animate-bounce">
                  YOU ARE THE CHAMPION!
                </div>
              )}
              {gameState === 'lost' && (
                <div className="text-[#ff0000] text-[14px] neon-text-red flicker">
                  CONTINUE? 9... 8... 7...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-8 text-[#ffd700] text-[8px] uppercase flex flex-col items-center gap-3 opacity-70">
        <div className="flex gap-6">
          <span>[P1] BUTTON A: REVEAL</span>
          <span>[P1] BUTTON B: FLAG</span>
        </div>
        <div className="tracking-[0.2em]">© 1991 CAPCOM STYLE MINESWEEPER</div>
      </div>
    </div>
  );
};
