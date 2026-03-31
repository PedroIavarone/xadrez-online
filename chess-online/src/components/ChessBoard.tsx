'use client';
import { useState, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { PIECE_IMAGES } from '@/lib/utils';

interface Props {
  game: Chess;
  playerColor: 'white' | 'black';
  isMyTurn: boolean;
  lastMove: { from: string; to: string } | null;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
}

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = [8,7,6,5,4,3,2,1];

export default function ChessBoard({ game, playerColor, isMyTurn, lastMove, onMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [validTargets, setValidTargets] = useState<Set<string>>(new Set());
  const [promoSquares, setPromoSquares] = useState<{ from: string; to: string } | null>(null);

  const isFlipped = playerColor === 'black';
  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;

  // Find king in check
  const checkSquare = useCallback((): string | null => {
    if (!game.inCheck()) return null;
    const color = game.turn();
    for (const r of '12345678') {
      for (const f of 'abcdefgh') {
        const sq = `${f}${r}` as Square;
        const p = game.get(sq);
        if (p && p.type === 'k' && p.color === color) return sq;
      }
    }
    return null;
  }, [game]);

  const handleSquare = (square: string) => {
    if (!isMyTurn || game.isGameOver()) return;

    const myColor = playerColor === 'white' ? 'w' : 'b';
    const piece = game.get(square as Square);

    if (selected) {
      if (validTargets.has(square)) {
        // Check pawn promotion
        const movingPiece = game.get(selected as Square);
        const toRank = square[1];
        if (
          movingPiece?.type === 'p' &&
          ((playerColor === 'white' && toRank === '8') ||
           (playerColor === 'black' && toRank === '1'))
        ) {
          setPromoSquares({ from: selected, to: square });
          return;
        }
        onMove({ from: selected, to: square });
        setSelected(null);
        setValidTargets(new Set());
      } else if (piece && piece.color === myColor) {
        // Reselect own piece
        const moves = game.moves({ square: square as Square, verbose: true });
        setSelected(square);
        setValidTargets(new Set(moves.map(m => m.to)));
      } else {
        setSelected(null);
        setValidTargets(new Set());
      }
    } else {
      if (piece && piece.color === myColor) {
        const moves = game.moves({ square: square as Square, verbose: true });
        setSelected(square);
        setValidTargets(new Set(moves.map(m => m.to)));
      }
    }
  };

  const handlePromotion = (piece: string) => {
    if (!promoSquares) return;
    onMove({ ...promoSquares, promotion: piece });
    setPromoSquares(null);
    setSelected(null);
    setValidTargets(new Set());
  };

  const kingInCheck = checkSquare();
  const sqSize = 'min(10vw, 72px)';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Wooden board border */}
      <div style={{
        padding: 'clamp(20px,3vw,32px)',
        background: 'linear-gradient(145deg, #7c4d23 0%, #5c3110 40%, #7c4d23 70%, #4a2608 100%)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,150,0.15), 0 0 0 1px rgba(0,0,0,0.5)',
      }}>
        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${sqSize})`,
          gridTemplateRows: `repeat(8, ${sqSize})`,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
        }}>
          {displayRanks.map((rank, ri) =>
            displayFiles.map((file, fi) => {
              const square = `${file}${rank}`;
              const piece  = game.get(square as Square);
              const fileIdx = FILES.indexOf(file);
              const isLight = (fileIdx + (rank - 1)) % 2 === 1;
              const isSelected   = selected === square;
              const isTarget     = validTargets.has(square);
              const isLastFrom   = lastMove?.from === square;
              const isLastTo     = lastMove?.to === square;
              const isCheck      = kingInCheck === square;

              // Background color
              let bg = isLight ? 'var(--light-sq)' : 'var(--dark-sq)';

              const overlayColor = isCheck
                ? 'rgba(220,50,50,0.55)'
                : isSelected
                ? 'rgba(20,120,40,0.55)'
                : (isLastFrom || isLastTo)
                ? 'rgba(155,199,0,0.45)'
                : undefined;

              const showRank = fi === 0;
              const showFile = ri === 7;

              const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;

              return (
                <div
                  key={square}
                  className="sq"
                  onClick={() => handleSquare(square)}
                  style={{
                    background: bg,
                    position: 'relative',
                    width: sqSize,
                    height: sqSize,
                  }}
                >
                  {/* Overlay highlight */}
                  {overlayColor && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: overlayColor,
                      zIndex: 1, pointerEvents: 'none',
                    }} />
                  )}

                  {/* Piece */}
                  {pieceKey && PIECE_IMAGES[pieceKey] && (
                    <img
                      src={PIECE_IMAGES[pieceKey]}
                      alt={pieceKey}
                      className="piece"
                      draggable={false}
                    />
                  )}

                  {/* Valid move indicator */}
                  {isTarget && !piece && <div className="move-dot" />}
                  {isTarget && piece && <div className="capture-ring" />}

                  {/* Coordinates */}
                  {showRank && (
                    <span className="coord-rank" style={{
                      color: isLight ? 'var(--dark-sq)' : 'var(--light-sq)',
                    }}>
                      {rank}
                    </span>
                  )}
                  {showFile && (
                    <span className="coord-file" style={{
                      color: isLight ? 'var(--dark-sq)' : 'var(--light-sq)',
                    }}>
                      {file}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Promotion modal */}
      {promoSquares && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 12, zIndex: 50,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--gold)',
            borderRadius: 16, padding: 24,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 18, fontWeight: 700,
              color: 'var(--gold)', marginBottom: 20,
            }}>
              Promover Peão
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {['q','r','b','n'].map(p => {
                const c = playerColor === 'white' ? 'w' : 'b';
                const key = `${c}${p.toUpperCase()}`;
                return (
                  <button key={p} className="promo-piece" onClick={() => handlePromotion(p)}>
                    <img src={PIECE_IMAGES[key]} alt={key} style={{ width: 48, height: 48 }} draggable={false} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
