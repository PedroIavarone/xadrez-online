'use client';
import { useState } from 'react';
import {
  Board4, PlayerColor4, PieceType4,
  getValidMoves, isValidSquare,
} from '@/lib/chess4';

const PIECE_SYMBOLS: Record<PieceType4, string> = {
  k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙',
};

const PLAYER_STYLES: Record<PlayerColor4, { bg: string; text: string; border: string }> = {
  red:    { bg: '#dc2626', text: '#fff', border: '#b91c1c' },
  blue:   { bg: '#2563eb', text: '#fff', border: '#1d4ed8' },
  yellow: { bg: '#ca8a04', text: '#fff', border: '#a16207' },
  green:  { bg: '#16a34a', text: '#fff', border: '#15803d' },
};

// Rotation so pawns face the board center
const PIECE_ROTATION: Record<PlayerColor4, number> = {
  red: 0, blue: 90, yellow: 180, green: 270,
};

interface Props {
  board: Board4;
  playerColor: PlayerColor4;
  isMyTurn: boolean;
  lastMove: { from: [number, number]; to: [number, number] } | null;
  eliminated: PlayerColor4[];
  onMove: (from: [number, number], to: [number, number]) => void;
}

const SQ = 46; // square size in px

export default function ChessBoard4({ board, playerColor, isMyTurn, lastMove, eliminated, onMove }: Props) {
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validTargets, setValidTargets] = useState<Set<string>>(new Set());

  const key = (r: number, c: number) => `${r},${c}`;

  const handleSquare = (row: number, col: number) => {
    if (!isMyTurn) return;
    const piece = board[row][col];
    const sqKey = key(row, col);

    if (selected) {
      if (validTargets.has(sqKey)) {
        onMove(selected, [row, col]);
        setSelected(null);
        setValidTargets(new Set());
      } else if (piece && piece.color === playerColor) {
        const moves = getValidMoves(board, row, col);
        setSelected([row, col]);
        setValidTargets(new Set(moves.map(([r, c]) => key(r, c))));
      } else {
        setSelected(null);
        setValidTargets(new Set());
      }
    } else {
      if (piece && piece.color === playerColor) {
        const moves = getValidMoves(board, row, col);
        setSelected([row, col]);
        setValidTargets(new Set(moves.map(([r, c]) => key(r, c))));
      }
    }
  };

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
      <div style={{
        display: 'inline-block',
        padding: 20,
        background: 'linear-gradient(145deg, #7c4d23 0%, #5c3110 40%, #7c4d23 70%, #4a2608 100%)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,150,0.15)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(14, ${SQ}px)`,
          gridTemplateRows: `repeat(14, ${SQ}px)`,
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {Array.from({ length: 14 }, (_, row) =>
            Array.from({ length: 14 }, (_, col) => {
              const valid = isValidSquare(row, col);
              if (!valid) {
                return (
                  <div
                    key={`${row}-${col}`}
                    style={{ width: SQ, height: SQ, background: 'transparent' }}
                  />
                );
              }

              const piece = board[row][col];
              const sqKey = key(row, col);
              const isSelected = selected?.[0] === row && selected?.[1] === col;
              const isTarget = validTargets.has(sqKey);
              const isLastFrom = lastMove?.from[0] === row && lastMove?.from[1] === col;
              const isLastTo = lastMove?.to[0] === row && lastMove?.to[1] === col;
              const isLight = (row + col) % 2 === 0;

              let overlayColor: string | undefined;
              if (isSelected) overlayColor = 'rgba(20,120,40,0.6)';
              else if (isLastFrom || isLastTo) overlayColor = 'rgba(200,180,0,0.5)';

              const style = piece ? PLAYER_STYLES[piece.color] : null;
              const rotation = piece ? PIECE_ROTATION[piece.color] : 0;
              const isElimPiece = piece && eliminated.includes(piece.color);

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => handleSquare(row, col)}
                  style={{
                    width: SQ,
                    height: SQ,
                    background: isLight ? '#F0D9B5' : '#B58863',
                    position: 'relative',
                    cursor: isMyTurn && piece?.color === playerColor ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  {overlayColor && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: overlayColor, zIndex: 1, pointerEvents: 'none',
                    }} />
                  )}

                  {piece && style && (
                    <div style={{
                      position: 'relative', zIndex: 2,
                      width: '82%', height: '82%',
                      background: isElimPiece ? '#555' : style.bg,
                      color: style.text,
                      border: `2px solid ${isElimPiece ? '#333' : style.border}`,
                      borderRadius: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 900,
                      transform: `rotate(${rotation}deg)`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      userSelect: 'none',
                      opacity: isElimPiece ? 0.4 : 1,
                      transition: 'opacity 0.3s',
                    }}>
                      {PIECE_SYMBOLS[piece.type]}
                    </div>
                  )}

                  {isTarget && !piece && (
                    <div style={{
                      position: 'absolute', zIndex: 3,
                      width: '32%', height: '32%',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.28)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  {isTarget && piece && (
                    <div style={{
                      position: 'absolute', zIndex: 3,
                      inset: 3,
                      borderRadius: '50%',
                      border: '4px solid rgba(0,0,0,0.28)',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
