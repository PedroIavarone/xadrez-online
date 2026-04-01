'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import PusherJS, { PresenceChannel } from 'pusher-js';
import ChessBoard from '@/components/ChessBoard';
import MoveHistory from '@/components/MoveHistory';
import { getUserId, formatTime } from '@/lib/utils';

type Color  = 'white' | 'black';
type Status = 'waiting' | 'playing' | 'ended';

interface MoveEvent {
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  moves: string[];
  timerWhite: number;
  timerBlack: number;
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  // Read stored time control (set on home page); default 10 min
  const INITIAL_TIME = (() => {
    if (typeof window === 'undefined') return 10 * 60 * 1000;
    const stored = localStorage.getItem(`chess_time_${roomId}`);
    return stored ? parseInt(stored) : 10 * 60 * 1000;
  })();

  const [game]        = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [status, setStatus]       = useState<Status>('waiting');
  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [memberCount, setMemberCount] = useState(0);
  const [lastMove, setLastMove]   = useState<{ from: string; to: string } | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const [copied, setCopied]       = useState(false);
  const [connected, setConnected] = useState(false);

  // Timers
  const [timerWhite, setTimerWhite] = useState(INITIAL_TIME);
  const [timerBlack, setTimerBlack] = useState(INITIAL_TIME);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const timerWhiteRef = useRef(INITIAL_TIME);
  const timerBlackRef = useRef(INITIAL_TIME);

  const channelRef = useRef<PresenceChannel | null>(null);
  const pusherRef  = useRef<PusherJS | null>(null);

  // ----------- Timer logic -----------
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((turn: 'w' | 'b') => {
    stopTimer();
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (turn === 'w') {
        timerWhiteRef.current = Math.max(0, timerWhiteRef.current - elapsed);
        setTimerWhite(timerWhiteRef.current);
        if (timerWhiteRef.current === 0) { stopTimer(); setResultMsg('Tempo esgotado! Pretas vencem.'); setStatus('ended'); }
      } else {
        timerBlackRef.current = Math.max(0, timerBlackRef.current - elapsed);
        setTimerBlack(timerBlackRef.current);
        if (timerBlackRef.current === 0) { stopTimer(); setResultMsg('Tempo esgotado! Brancas vencem.'); setStatus('ended'); }
      }
    }, 100);
  }, [stopTimer]);

  // ----------- Apply a move to local game -----------
  const applyMove = useCallback((data: MoveEvent) => {
    try {
      game.load(data.fen);
      setFen(data.fen);
      setMoves(data.moves);
      setLastMove({ from: data.from, to: data.to });

      timerWhiteRef.current = data.timerWhite;
      timerBlackRef.current = data.timerBlack;
      setTimerWhite(data.timerWhite);
      setTimerBlack(data.timerBlack);

      if (game.isGameOver()) {
        stopTimer();
        setStatus('ended');
        if (game.isCheckmate()) {
          const winner = game.turn() === 'w' ? 'Pretas' : 'Brancas';
          setResultMsg(`Xeque-mate! ${winner} vencem! 🏆`);
        } else if (game.isDraw()) {
          setResultMsg('Empate! 🤝');
        } else if (game.isStalemate()) {
          setResultMsg('Afogamento! Empate.');
        }
      } else {
        startTimer(game.turn());
      }
    } catch (e) {
      console.error('Apply move error:', e);
    }
  }, [game, startTimer, stopTimer]);

  // ----------- Setup Pusher -----------
  useEffect(() => {
    const userId = getUserId();
    const storedColor = localStorage.getItem(`chess_color_${roomId}`) as Color | null;
    const color = storedColor || 'white';
    setPlayerColor(color);

    const pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: { params: { user_id: userId } },
    });
    pusherRef.current = pusher;

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));

    const channel = pusher.subscribe(`presence-chess-${roomId}`) as PresenceChannel;
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      setMemberCount(members.count);
      if (members.count >= 2) setStatus('playing');
    });

    channel.bind('pusher:member_added', () => {
      setMemberCount(prev => {
        const next = prev + 1;
        if (next >= 2) {
          setStatus(s => {
            if (s === 'waiting') {
              // If white, start timer
              if (color === 'white') startTimer('w');
              return 'playing';
            }
            return s;
          });
          // White sends sync
          if (color === 'white') {
            setTimeout(() => {
              channelRef.current?.trigger('client-sync', {
                fen: game.fen(),
                moves: game.history(),
                timerWhite: timerWhiteRef.current,
                timerBlack: timerBlackRef.current,
              });
            }, 600);
          }
        }
        return next;
      });
    });

    channel.bind('pusher:member_removed', () => {
      setMemberCount(prev => Math.max(0, prev - 1));
    });

    // Receive move from opponent
    channel.bind('client-move', (data: MoveEvent) => {
      applyMove(data);
    });

    // Receive sync from white player
    channel.bind('client-sync', (data: { fen: string; moves: string[]; timerWhite: number; timerBlack: number }) => {
      game.load(data.fen);
      setFen(data.fen);
      setMoves(data.moves);
      timerWhiteRef.current = data.timerWhite;
      timerBlackRef.current = data.timerBlack;
      setTimerWhite(data.timerWhite);
      setTimerBlack(data.timerBlack);
      setStatus('playing');
      startTimer(game.turn());
    });

    // Receive resign
    channel.bind('client-resign', (data: { color: string }) => {
      stopTimer();
      setStatus('ended');
      const winner = data.color === 'white' ? 'Pretas' : 'Brancas';
      setResultMsg(`${data.color === 'white' ? 'Brancas' : 'Pretas'} desistiu. ${winner} vencem!`);
    });

    return () => {
      stopTimer();
      pusher.unsubscribe(`presence-chess-${roomId}`);
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ----------- Handle move from local player -----------
  const handleMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    const myColor = playerColor === 'white' ? 'w' : 'b';
    if (game.turn() !== myColor) return;

    try {
      const result = game.move({ ...move, promotion: move.promotion || 'q' });
      if (!result) return;

      const newFen = game.fen();
      setFen(newFen);

      const history = game.history();
      setMoves(history);
      setLastMove({ from: move.from, to: move.to });

      const eventData: MoveEvent = {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        fen: newFen,
        moves: history,
        timerWhite: timerWhiteRef.current,
        timerBlack: timerBlackRef.current,
      };

      channelRef.current?.trigger('client-move', eventData);

      if (game.isGameOver()) {
        stopTimer();
        setStatus('ended');
        if (game.isCheckmate()) {
          const winner = game.turn() === 'w' ? 'Pretas' : 'Brancas';
          setResultMsg(`Xeque-mate! ${winner} vencem! 🏆`);
        } else if (game.isDraw()) {
          setResultMsg('Empate! 🤝');
        } else {
          setResultMsg('Fim de jogo!');
        }
      } else {
        startTimer(game.turn());
      }
    } catch (e) {
      console.error('Move error:', e);
    }
  }, [game, playerColor, startTimer, stopTimer]);

  // ----------- Resign -----------
  const handleResign = () => {
    if (status !== 'playing') return;
    channelRef.current?.trigger('client-resign', { color: playerColor });
    stopTimer();
    setStatus('ended');
    const winner = playerColor === 'white' ? 'Pretas' : 'Brancas';
    setResultMsg(`Você desistiu. ${winner} vencem.`);
  };

  // ----------- Copy link -----------
  const copyLink = () => {
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMyTurn = status === 'playing' &&
    (game.turn() === 'w' ? playerColor === 'white' : playerColor === 'black');

  const parsedGame = new Chess();
  try { parsedGame.load(fen); } catch {}

  // ========== RENDER ==========
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px',
      gap: 0,
    }}>

      {/* Header */}
      <header style={{
        width: '100%', maxWidth: 1100,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        padding: '0 4px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', fontSize: 24,
            cursor: 'pointer', fontFamily: 'Playfair Display, serif',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          ♟ <span style={{ fontSize: 18 }}>Xadrez Online</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Connection dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#4ade80' : '#f87171',
              boxShadow: connected ? '0 0 6px #4ade80' : '0 0 6px #f87171',
            }} />
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {/* Time mode badge */}
          {(() => {
            const stored = typeof window !== 'undefined' ? localStorage.getItem(`chess_time_${roomId}`) : null;
            const ms = stored ? parseInt(stored) : 10 * 60 * 1000;
            const mins = Math.round(ms / 60000);
            const label = mins === 1 ? 'Bullet 1\'' : mins === 3 ? 'Blitz 3\'' : mins === 10 ? 'Padrão 10\'' : `${mins}'`;
            return (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 10px',
                color: 'var(--gold)', fontSize: 11, fontWeight: 700,
              }}>
                ⏱ {label}
              </div>
            );
          })()}

          {/* Room code */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px',
            color: 'var(--text-dim)', fontSize: 12, letterSpacing: '0.05em',
          }}>
            Sala: <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.15em' }}>{roomId}</span>
          </div>

          <button
            onClick={copyLink}
            style={{
              background: copied ? 'rgba(74,222,128,0.15)' : 'var(--surface)',
              border: `1px solid ${copied ? '#4ade80' : 'var(--border)'}`,
              borderRadius: 8, padding: '6px 14px',
              color: copied ? '#4ade80' : 'var(--text-dim)',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copiado!' : '⎘ Copiar link'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div style={{
        width: '100%', maxWidth: 1100,
        display: 'flex', gap: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>

        {/* Left panel: opponent info + board + my info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>

          {/* Opponent */}
          <PlayerBar
            label={playerColor === 'white' ? 'Pretas' : 'Brancas'}
            color={playerColor === 'white' ? 'black' : 'white'}
            time={playerColor === 'white' ? timerBlack : timerWhite}
            isActive={status === 'playing' && (
              playerColor === 'white'
                ? game.turn() === 'b'
                : game.turn() === 'w'
            )}
          />

          {/* The board */}
          <div style={{ position: 'relative' }}>
            <ChessBoard
              game={parsedGame}
              playerColor={playerColor}
              isMyTurn={isMyTurn}
              lastMove={lastMove}
              onMove={handleMove}
            />

            {/* Waiting overlay */}
            {status === 'waiting' && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: 'rgba(13,11,9,0.88)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)', gap: 20,
                zIndex: 40,
              }}>
                <div style={{ fontSize: 48 }}>⏳</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 22, fontWeight: 700, color: 'var(--gold)',
                  textAlign: 'center',
                }}>
                  Aguardando oponente...
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                  Compartilhe o link abaixo com seu amigo para ele entrar na partida.
                </div>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--gold)',
                  borderRadius: 10, padding: '10px 20px',
                  color: 'var(--gold)', fontSize: 20,
                  fontWeight: 700, letterSpacing: '0.2em',
                  fontFamily: 'DM Sans, monospace',
                }}>
                  {roomId}
                </div>
                <button
                  onClick={copyLink}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #c9a84c, #a07828)',
                    border: 'none', borderRadius: 8,
                    color: '#1a1200', fontWeight: 700, fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ Link copiado!' : '⎘ Copiar link de convite'}
                </button>
              </div>
            )}

            {/* End overlay */}
            {status === 'ended' && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: 'rgba(13,11,9,0.92)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)', gap: 20,
                zIndex: 40,
              }}>
                <div style={{ fontSize: 56 }}>🏁</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 'clamp(18px,3vw,26px)', fontWeight: 900,
                  color: 'var(--gold)', textAlign: 'center',
                  maxWidth: 320,
                }}>
                  {resultMsg}
                </div>
                <button
                  onClick={() => router.push('/')}
                  style={{
                    padding: '12px 32px',
                    background: 'linear-gradient(135deg, #c9a84c, #a07828)',
                    border: 'none', borderRadius: 10,
                    color: '#1a1200', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer', marginTop: 8,
                  }}
                >
                  ← Novo Jogo
                </button>
              </div>
            )}
          </div>

          {/* Me */}
          <PlayerBar
            label={playerColor === 'white' ? 'Brancas (você)' : 'Pretas (você)'}
            color={playerColor}
            time={playerColor === 'white' ? timerWhite : timerBlack}
            isActive={isMyTurn}
            isMe
          />
        </div>

        {/* Right panel: Move history + controls */}
        <div style={{
          flex: '0 0 auto', width: 260,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

          {/* Status card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Status
            </div>
            <div style={{
              color: status === 'ended'
                ? '#fca5a5'
                : isMyTurn
                ? '#4ade80'
                : 'var(--text)',
              fontWeight: 600, fontSize: 15,
            }}>
              {status === 'waiting'
                ? '⏳ Aguardando oponente'
                : status === 'ended'
                ? '🏁 Fim de partida'
                : isMyTurn
                ? '♟ Sua vez!'
                : '⌛ Vez do oponente'}
            </div>
            {status === 'playing' && game.inCheck() && (
              <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                ⚠️ Xeque!
              </div>
            )}
          </div>

          {/* Move history */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
            flex: 1,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Histórico de Lances
            </div>
            <MoveHistory moves={moves} />
          </div>

          {/* Controls */}
          {status === 'playing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleResign}
                style={{
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(248,113,113,0.4)',
                  borderRadius: 10,
                  color: '#f87171',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#f87171';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.4)';
                }}
              >
                🏳 Desistir
              </button>
            </div>
          )}

          {/* Members */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text-dim)', fontSize: 12,
            padding: '0 2px',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= memberCount ? '#4ade80' : 'var(--border)',
                  boxShadow: i <= memberCount ? '0 0 4px #4ade80' : 'none',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
            {memberCount}/2 jogadores conectados
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Player bar component ----
function PlayerBar({
  label, color, time, isActive, isMe,
}: {
  label: string;
  color: Color;
  time: number;
  isActive: boolean;
  isMe?: boolean;
}) {
  const timeStr = formatTime(time);
  const isLow = time < 30_000;

  return (
    <div style={{
      width: '100%',
      maxWidth: 'min(80vw, 576px)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      background: isActive ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
      border: `1px solid ${isActive ? 'var(--gold-dim)' : 'var(--border)'}`,
      borderRadius: 10,
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Piece icon */}
        <div style={{
          width: 28, height: 28,
          background: color === 'white' ? '#F0D9B5' : '#1a1a1a',
          border: `2px solid ${color === 'white' ? '#d0b890' : '#444'}`,
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {color === 'white' ? '♔' : '♚'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--gold)' : 'var(--text)' }}>
            {label}
          </div>
          {isActive && (
            <div style={{ fontSize: 11, color: 'var(--gold)', opacity: 0.7 }}>
              {isMe ? 'Sua vez ▸' : 'Pensando...'}
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      <div style={{
        fontFamily: 'DM Sans, monospace',
        fontSize: 22, fontWeight: 700,
        color: isLow && isActive ? '#f87171' : isActive ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.05em',
        padding: '4px 12px',
        background: isActive ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
        borderRadius: 8,
        transition: 'color 0.3s',
        minWidth: 80, textAlign: 'center',
      }}>
        {timeStr}
      </div>
    </div>
  );
}
