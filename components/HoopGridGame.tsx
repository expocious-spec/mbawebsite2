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
  isCorrect?: boolean;
  rarity?: number;
}

interface Player {
  id: string;
  username: string;
  minecraft_username?: string;
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
    if (grid[row][col]?.isCorrect) return; // Already answered correctly
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
        playerName: player.minecraft_username || player.username,
        isCorrect: result.isValid,
        rarity: result.rarity,
      };
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading puzzle...</div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Failed to load puzzle</div>
      </div>
    );
  }

  const completedCells = grid.flat().filter(cell => cell?.isCorrect).length;
  const isComplete = completedCells === 9;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">MBA HoopGrids</h1>
          <p className="text-gray-400">Daily Basketball Grid Challenge</p>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(puzzle.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Score */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold">
            Rarity Score: {totalRarity.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            {completedCells}/9 Correct {isComplete && '🎉 Complete!'}
          </div>
        </div>

        {/* Grid */}
        <div className="mb-8">
          <div className="inline-block">
            {/* Column headers */}
            <div className="flex mb-2">
              <div className="w-32"></div>
              {puzzle.columns.map((col, idx) => (
                <div key={idx} className="w-32 h-32 flex items-center justify-center">
                  {col.team && (
                    <div className="text-center">
                      {col.team.team_logo_url ? (
                        <Image 
                          src={col.team.team_logo_url} 
                          alt={col.team.name}
                          width={80}
                          height={80}
                          className="mx-auto mb-1"
                        />
                      ) : col.team.team_logo_emoji ? (
                        <div className="text-6xl mb-1">{col.team.team_logo_emoji}</div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-1" />
                      )}
                      <div className="text-xs font-semibold">{col.team.name}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {puzzle.rows.map((rowCriteria, rowIdx) => (
              <div key={rowIdx} className="flex">
                {/* Row header */}
                <div className="w-32 h-32 flex items-center justify-center text-center px-2">
                  <div className="text-sm font-semibold">{rowCriteria.label}</div>
                </div>

                {/* Cells */}
                {[0, 1, 2].map(colIdx => {
                  const cell = grid[rowIdx][colIdx];
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;

                  return (
                    <button
                      key={colIdx}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      className={`w-32 h-32 border-2 flex items-center justify-center text-center transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20'
                          : cell?.isCorrect
                          ? 'border-green-500 bg-green-500/20'
                          : cell
                          ? 'border-red-500 bg-red-500/20'
                          : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800/50'
                      }`}
                    >
                      {cell ? (
                        <div className="px-2">
                          <div className="font-bold text-sm">{cell.playerName}</div>
                          {cell.isCorrect && (
                            <div className="text-xs text-gray-400 mt-1">
                              {cell.rarity === 0 ? 'Unique!' : `${cell.rarity} picks`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-600">?</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Player search */}
        {selectedCell && (
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">
              Select a player for {puzzle.rows[selectedCell.row].label} + {puzzle.columns[selectedCell.col].team?.name}
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchPlayers(e.target.value);
              }}
              placeholder="Search for a player..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-2 bg-gray-800 border border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
                  >
                    {player.minecraft_username || player.username}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Click a cell to make a guess. Find a player that matches both the row and column criteria.</p>
          <p className="mt-2">Lower rarity scores are better (means you picked unique players)!</p>
        </div>
      </div>
    </div>
  );
}
