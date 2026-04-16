'use client';

import { useEffect, useState } from 'react';
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
}

interface Player {
  id: string;
  displayName: string;
  minecraftUsername?: string;
  minecraftUserId?: string;
  profilePicture?: string;
}

export default function HoopGridGame() {
  const { data: session } = useSession();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<(CellState | null)[][]>(Array(3).fill(null).map(() => Array(3).fill(null)));
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRarity, setTotalRarity] = useState(0);
  const [guessesRemaining, setGuessesRemaining] = useState(9);

  useEffect(() => {
    loadPuzzle();
  }, []);

  const loadPuzzle = async () => {
    try {
      const res = await fetch('/api/minigames/hoopgrids/daily');
      const data = await res.json();
      setPuzzle(data);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}`);
      const players = await res.json();
      setSearchResults(players.slice(0, 10));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (grid[row][col]) return; // Already guessed this cell
    if (guessesRemaining === 0) return; // No guesses left
    setSelectedCell({ row, col });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handlePlayerSelect = async (player: Player) => {
    if (!selectedCell || !puzzle) return;

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
        isCorrect: result.isValid,
        rarity: result.rarity,
      };
      setGuessesRemaining(prev => prev - 1);
      setGrid(newGrid);

      if (result.isValid) {
        setTotalRarity(prev => prev + result.rarity);
      }

      setSelectedCell(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-2xl font-bold text-blue-400">
          Loading puzzle...
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

  const completedCells = grid.flat().filter(cell => cell?.isCorrect).length;
  const isComplete = completedCells === 9;
  const isGameOver = guessesRemaining === 0 || isComplete;

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
        </div>

        {/* Score */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 rounded-xl px-8 py-4">
            <div className="text-3xl font-bold text-white">
              Rarity Score: {totalRarity.toFixed(2)}
            </div>
            <div className="text-sm text-blue-100 mt-1">
              {completedCells}/9 Correct • {guessesRemaining} Guesses Left
            </div>
            {isComplete && <div className="text-lg mt-2 text-green-300">🎉 Perfect Game!</div>}
            {isGameOver && !isComplete && <div className="text-lg mt-2 text-red-300">Game Over</div>}pletedCells}/9 Correct {isComplete && '🎉 Complete!'}
            </div>
          </div>
        </div>
 rounded-xl p-6
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
                          : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50 cursor-pointer
                          ? 'border-red-400 bg-red-500/20'
                          : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50 hover:scale-102'
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
                          {cell.isCorrect && (
                            <div className="text-xs text-green-300 mt-1 font-semibold">
                              {cell.rarity === 0 ? '✨ Unique!' : `${cell.rarity} picks`}
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
            ))}!isGameOver && (
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6
        </div>

        {/* Player search */}
        {selectedCell && (
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
                setSearchQuery(e.target.value);
                searchPlayers(e.target.value);lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-3 bg-gray-900 border-2 border-gray-700 rounded-lg
            />
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
 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-100">How to Play</h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>🎯 You have 9 guesses to complete the grid</p>
              <p>🔍 Find a player that matches both the row and column criteria</p>
              <p>⭐ Lower rarity scores are better (unique picks score 0)</p>
              <p>✅ Green = Correct | ❌ Red = Wrong
              <p>🔍 Find a player that matches both the row and column criteria</p>
              <p>⭐ Lower rarity scores are better (unique picks score 0)</p>
              <p>🏆 Complete all 9 cells to finish the puzzle!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
