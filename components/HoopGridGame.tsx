'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Team {
  id: string;
  name: string;
  logo?: string;
  team_logo_url?: string;
  team_logo_emoji?: string;
  primary_color: string;
}

interface Criteria {
  type: string;
  value: string;
  label: string;
}

interface Column {
  type: string;
  value: string;
  team?: Team;
}

interface Puzzle {
  id: number;
  date: string;
  columns: Column[];
  rows: Criteria[];
}

interface CellState {
  playerId?: string;
  playerName?: string;
  playerPicture?: string;
  isCorrect?: boolean;
  rarity?: number;
  statValue?: string;
  statLabel?: string;
}

interface Player {
  id: string;
  displayName: string;
  minecraftUsername?: string;
  minecraftUserId?: string;
  profilePicture?: string;
}

export default function HoopGridGame() {
  const { data: session, status } = useSession();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<(CellState | null)[][]>(Array(3).fill(null).map(() => Array(3).fill(null)));
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRarity, setTotalRarity] = useState(0);
  const [guessesRemaining, setGuessesRemaining] = useState(9);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [startTime] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Track used player IDs
  const usedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    grid.flat().forEach(cell => {
      if (cell?.playerId) {
        ids.add(cell.playerId);
      }
    });
    return ids;
  }, [grid]);

  useEffect(() => {
    loadPuzzle();
  }, [session?.user?.id]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadPuzzle = async () => {
    try {
      const res = await fetch('/api/minigames/hoopgrids/daily');
      const data = await res.json();
      setPuzzle(data);

      // Check if user already completed today's puzzle
      if (session?.user?.id && data.id) {
        const completionRes = await fetch(`/api/minigames/hoopgrids/completion?puzzleId=${data.id}&userId=${session.user.id}`);
        const completionData = await completionRes.json();
        
        // Load their previous attempts (whether completed or not)
        if (completionData.attempts && completionData.attempts.length > 0) {
          const loadedGrid: (CellState | null)[][] = Array(3).fill(null).map(() => Array(3).fill(null));
          let totalRaritySum = 0;
          let correctGuesses = 0;
          
          completionData.attempts.forEach((attempt: any) => {
            loadedGrid[attempt.cell_row][attempt.cell_col] = {
              playerId: attempt.guessed_player_id,
              playerName: attempt.player_name,
              playerPicture: attempt.player_picture,
              isCorrect: attempt.is_correct,
              rarity: attempt.rarity,
              statValue: attempt.stat_value,
              statLabel: attempt.stat_label,
            };
            
            if (attempt.is_correct) {
              totalRaritySum += attempt.rarity || 0;
              correctGuesses++;
            }
          });
          
          setGrid(loadedGrid);
          
          if (completionData.completed) {
            // Puzzle is fully completed
            setAlreadyCompleted(true);
            setTotalRarity(completionData.rarity_score || 0);
            setGuessesRemaining(0);
          } else {
            // Partial progress - restore guesses remaining
            const attemptCount = completionData.attempts.length;
            setGuessesRemaining(9 - attemptCount);
            setTotalRarity(correctGuesses > 0 ? totalRaritySum / correctGuesses : 0);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load puzzle:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/minigames/hoopgrids/search?q=${encodeURIComponent(query)}`);
        const players = await res.json();
        // Filter out already used players
        const availablePlayers = players.filter((p: Player) => !usedPlayerIds.has(p.id));
        setSearchResults(availablePlayers);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 150); // 150ms debounce - faster response
  }, [usedPlayerIds]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (grid[row][col]) return;
    if (guessesRemaining === 0) return;
    if (alreadyCompleted) return;
    setSelectedCell({ row, col });
    setSearchQuery('');
    setSearchResults([]);
    setErrorMessage(''); // Clear any previous error
  }, [grid, guessesRemaining, alreadyCompleted]);

  const handlePlayerSelect = useCallback(async (player: Player) => {
    if (!selectedCell || !puzzle) return;

    // Check if player has already been used
    if (usedPlayerIds.has(player.id)) {
      setErrorMessage('This player has already been used in the grid!');
      return;
    }

    setErrorMessage(''); // Clear error
    const { row, col } = selectedCell;
    const userId = session?.user?.id;

    try {
      const res = await fetch('/api/minigames/hoopgrids/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: puzzle.id,
          row,
          col,
          playerId: player.id,
          userId,
        }),
      });

      const result = await res.json();

      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = {
        playerId: player.id,
        playerName: player.minecraftUsername || player.displayName,
        playerPicture: player.profilePicture,
        isCorrect: result.isValid,
        rarity: result.rarity,
        statValue: result.statValue,
        statLabel: result.statLabel,
      };
      const newGuessesRemaining = guessesRemaining - 1;
      setGuessesRemaining(newGuessesRemaining);
      setGrid(newGrid);

      if (result.isValid) {
        const newRarity = totalRarity + result.rarity;
        setTotalRarity(newRarity);
        
        // Check if puzzle is complete
        const correctCount = newGrid.flat().filter(cell => cell?.isCorrect).length;
        if (correctCount === 9 && userId) {
          // Save completion - perfect game
          const completionTime = Math.floor((Date.now() - startTime) / 1000);
          await fetch('/api/minigames/hoopgrids/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: puzzle.id,
              userId,
              rarityScore: newRarity,
              completionTime,
            }),
          });
          setAlreadyCompleted(true);
          setGuessesRemaining(0);
          setShowCompletionModal(true);
        } else if (newGuessesRemaining === 0 && userId) {
          // Save completion - used all guesses but not perfect
          const completionTime = Math.floor((Date.now() - startTime) / 1000);
          await fetch('/api/minigames/hoopgrids/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: puzzle.id,
              userId,
              rarityScore: newRarity,
              completionTime,
            }),
          });
          setAlreadyCompleted(true);
          setShowCompletionModal(true);
        }
      } else {
        // Wrong answer - check if game over
        if (newGuessesRemaining === 0 && userId) {
          // Save completion - game over
          const completionTime = Math.floor((Date.now() - startTime) / 1000);
          await fetch('/api/minigames/hoopgrids/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: puzzle.id,
              userId,
              rarityScore: totalRarity,
              completionTime,
            }),
          });
          setAlreadyCompleted(true);
          setShowCompletionModal(true);
        }
      }

      setSelectedCell(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [selectedCell, puzzle, session, grid, totalRarity, startTime, usedPlayerIds]);

  // Memoized calculations for performance
  const completedCells = useMemo(() => 
    grid.flat().filter(cell => cell?.isCorrect).length, 
    [grid]
  );
  
  const isComplete = useMemo(() => completedCells === 9, [completedCells]);
  const isGameOver = useMemo(() => guessesRemaining === 0 || isComplete, [guessesRemaining, isComplete]);

  const handleCopyResults = useCallback(() => {
    if (!puzzle) return;

    const date = new Date(puzzle.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const gridDisplay = grid.map(row => 
      row.map(cell => cell?.isCorrect ? '🟩' : (cell ? '🟥' : '⬜')).join('')
    ).join('\n');

    const shareText = `MBA HoopGrids - ${date}\n\n${gridDisplay}\n\nRarity: ${totalRarity.toFixed(1)}%\nScore: ${completedCells}/9\n\nPlay at: ${window.location.origin}/minigames/hoopgrids`;

    navigator.clipboard.writeText(shareText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }, [puzzle, grid, totalRarity, completedCells]);

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-2xl font-bold text-blue-400">
          Loading puzzle...
        </div>
      </div>
    );
  }

  // Require authentication
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold text-white mb-4">Login Required</h2>
          <p className="text-gray-300 mb-6">You must be logged in to play HoopGrids.</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Sign In to Play
          </button>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-2xl font-bold text-red-400">Failed to load puzzle</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 text-blue-400">
            MBA HoopGrids
          </h1>
          <p className="text-xl text-gray-300">Daily Basketball Grid Challenge</p>
          <p className="text-sm text-gray-400 mt-2">
            {new Date(puzzle.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {alreadyCompleted && (
            <div className="mt-2 inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-semibold">
              ✓ Completed Today
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 rounded-xl px-8 py-4">
            <div className="text-3xl font-bold text-white">
              Rarity Score: {totalRarity.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-100 mt-1">
              {completedCells}/9 Correct • {guessesRemaining} Guesses Left
            </div>
            <div className="text-xs text-blue-200 mt-1">
              Lower is better!
            </div>
            {isComplete && !alreadyCompleted && <div className="text-lg mt-2 text-green-300">🎉 Perfect Game!</div>}
            {isGameOver && !isComplete && !alreadyCompleted && <div className="text-lg mt-2 text-red-300">Game Over</div>}
          </div>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl border-2 border-gray-700 transform animate-bounce-in">
              <div className="text-center">
                <div className="text-5xl mb-3">{isComplete ? '🎉' : '⏰'}</div>
                <h2 className="text-2xl font-bold text-white mb-1">{isComplete ? 'Congratulations!' : 'Game Over!'}</h2>
                <p className="text-sm text-gray-300 mb-4">{isComplete ? 'You completed today\'s HoopGrid!' : 'You\'ve used all your guesses!'}</p>
                
                <div className="bg-gray-900/80 rounded-lg p-4 mb-4">
                  <div className="space-y-3">
                    {/* Visual Grid Result */}
                    <div>
                      <p className="text-xs text-gray-400 font-semibold mb-2 text-center">Your Grid</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {grid.flat().map((cell, idx) => (
                          <div 
                            key={idx}
                            className={`aspect-square rounded-md flex flex-col items-center justify-center p-1.5 ${
                              cell?.isCorrect 
                                ? 'bg-green-500/20 border border-green-400' 
                                : cell 
                                ? 'bg-red-500/20 border border-red-400' 
                                : 'bg-gray-700/30 border border-gray-600'
                            }`}
                          >
                            {cell ? (
                              <>
                                {cell.playerPicture && (
                                  <img 
                                    src={cell.playerPicture} 
                                    alt={cell.playerName}
                                    className="w-8 h-8 rounded-sm mb-0.5"
                                  />
                                )}
                                <div className="text-[9px] font-bold text-white text-center leading-tight line-clamp-1">
                                  {cell.playerName}
                                </div>
                                <div className="text-sm mt-0.5">
                                  {cell.isCorrect ? '✓' : '✗'}
                                </div>
                              </>
                            ) : (
                              <div className="text-xl text-gray-500">?</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm font-semibold">Rarity Score:</span>
                        <span className="text-xl font-bold text-yellow-400">{totalRarity.toFixed(1)}%</span>
                      </div>
                      <div className="text-[10px] text-gray-400">Lower is better! 0% = all unique picks</div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm font-semibold">Correct Cells:</span>
                        <span className="text-xl font-bold text-green-400">{completedCells}/9</span>
                      </div>
                      {isComplete && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-sm font-semibold">Time:</span>
                          <span className="text-lg font-bold text-blue-400">
                            {Math.floor((Date.now() - startTime) / 60000)}m {Math.floor(((Date.now() - startTime) % 60000) / 1000)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleCopyResults}
                    className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {copySuccess ? (
                      <>
                        <span>✓</span>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy Score</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => window.location.href = '/minigames'}
                    className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Exit to Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex justify-center mb-8">
          <div className="inline-block bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
            {/* Column headers */}
            <div className="flex mb-3">
              <div className="w-40"></div>
              {puzzle.columns.map((col, idx) => (
                <div key={idx} className="w-40 h-40 flex items-center justify-center p-2">
                  {col.team && (
                    <div className="text-center">
                      {col.team.team_logo_url ? (
                        <img 
                          src={col.team.team_logo_url} 
                          alt={col.team.name}
                          className="w-24 h-24 object-contain mx-auto mb-2"
                        />
                      ) : col.team.team_logo_emoji ? (
                        <div className="text-7xl mb-2">{col.team.team_logo_emoji}</div>
                      ) : col.team.logo ? (
                        <img 
                          src={col.team.logo} 
                          alt={col.team.name}
                          className="w-24 h-24 object-contain mx-auto mb-2"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-3xl font-bold text-gray-300">
                            {col.team.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="text-xs font-bold text-gray-200">{col.team.name}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {puzzle.rows.map((rowCriteria, rowIdx) => (
              <div key={rowIdx} className="flex">
                {/* Row header */}
                <div className="w-40 h-40 flex items-center justify-center text-center px-3">
                  <div className="text-sm font-bold text-gray-200 leading-tight">{rowCriteria.label}</div>
                </div>

                {/* Cells */}
                {[0, 1, 2].map(colIdx => {
                  const cell = grid[rowIdx][colIdx];
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;

                  return (
                    <button
                      key={colIdx}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      disabled={isGameOver && !cell}
                      className={`w-40 h-40 border-2 flex items-center justify-center text-center transition-colors m-0.5 rounded-lg ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/30'
                          : cell?.isCorrect
                          ? 'border-green-400 bg-green-500/20'
                          : cell
                          ? 'border-red-400 bg-red-500/20'
                          : isGameOver
                          ? 'border-gray-700 bg-gray-800 cursor-not-allowed'
                          : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50 cursor-pointer'
                      }`}
                    >
                      {cell ? (
                        <div className="px-2 flex flex-col items-center">
                          {cell.playerPicture && (
                            <img 
                              src={cell.playerPicture} 
                              alt={cell.playerName}
                              className="w-16 h-16 rounded-lg mb-1"
                            />
                          )}
                          <div className="font-bold text-xs text-white text-center">{cell.playerName}</div>
                          {cell.statValue && cell.statLabel && (
                            <div className={`text-xs mt-1 font-bold ${cell.isCorrect ? 'text-blue-200' : 'text-gray-400'}`}>
                              {cell.statValue} {cell.statLabel}
                            </div>
                          )}
                          {cell.isCorrect && (
                            <div className="text-xs text-green-300 mt-0.5 font-semibold">
                              {cell.rarity === 0 ? '✨ 0%' : `${(cell.rarity || 0).toFixed(1)}%`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-5xl text-gray-500 font-light">?</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Player search */}
        {selectedCell && !isGameOver && !alreadyCompleted && (
          <div className="max-w-md mx-auto bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-bold mb-3 text-center text-gray-100">
              Select: {puzzle.rows[selectedCell.row].label}
              <span className="text-blue-400"> + </span>
              {puzzle.columns[selectedCell.col].team?.name}
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                debouncedSearch(value);
              }}
              placeholder="Search for a player..."
              className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
              autoFocus
            />
            {errorMessage && (
              <div className="mt-3 bg-red-500/20 border-2 border-red-500 rounded-lg px-4 py-3 text-red-200 text-sm font-semibold flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                {errorMessage}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-3 bg-gray-900 border-2 border-gray-700 rounded-xl max-h-80 overflow-y-auto">
                {searchResults.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-600/20 transition-colors flex items-center gap-3 border-b border-gray-800 last:border-b-0"
                  >
                    {player.profilePicture && (
                      <img 
                        src={player.profilePicture} 
                        alt={player.displayName}
                        className="w-10 h-10 rounded-lg"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-white">
                        {player.minecraftUsername || player.displayName}
                      </div>
                      {player.minecraftUsername && player.displayName !== player.minecraftUsername && (
                        <div className="text-xs text-gray-400">{player.displayName}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-gray-100">How to Play</h3>
          <div className="space-y-2 text-gray-300 text-sm">
            <p>🎯 You have 9 guesses to complete the grid</p>
            <p>🔍 Find a player that matches both the row and column criteria</p>
            <p>🚫 Each player can only be used once per grid</p>
            <p>⭐ Rarity % = how many people picked that player (lower is better!)</p>
            <p>✅ Green = Correct | ❌ Red = Wrong</p>
            <p>🏆 Complete all 9 cells to finish the puzzle!</p>
            <p className="pt-2 border-t border-gray-700 font-semibold text-yellow-400">
              ⏰ One puzzle per day • Resets at midnight
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
