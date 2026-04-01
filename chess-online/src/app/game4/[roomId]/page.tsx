'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PusherJS, { PresenceChannel } from 'pusher-js';
import ChessBoard4 from '@/components/ChessBoard4';
import {
  GameState4, PlayerColor4,
  createInitialState4, makeMove4, getWinner4,
} from '@/lib/chess4';
import { getUserId } from '@/lib/utils';
import { Suspense } from 'react';

const PLAYER_LABELS: Record<PlayerColor4, string> = {
  red: 'Vermelho', blue: 'Azul', yellow: 'Amarelo', green: 'Verde',
};

const PLAYER_COLORS_CSS: Record<PlayerColor4, string> = {
  red: '#dc2626', blue: '#2563eb', yellow: '#ca8a04', green: '#16a34a',
};

const PLAYER_ICONS: Record<PlayerColor4, string> = {
  red: '♔', blue: '♔', yellow: '♔', green: '♔',
};

type Status = 'waiting' | 'playing' | 'ended';

function Game4Inner() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [playerColor, setPlayerColor] = useState<PlayerColor4 | null>(null);
  const [gameState, setGameState] = useState<GameState4>(createInitialState4());
  const [status, setStatus] = useState<Status>('waiting');
  const [memberCount, setMemberCount] = useState(0);
  const [resultMsg, setResultMsg] = useState('');
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const channelRef = useRef<PresenceChannel | null>(null);
  const gameStateRef = useRef<GameState4>(createInitialState4());
  const playerColorRef = useRef<PlayerColor4 | null>(null);

  // Sync refs with state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);

  // Resolve player color
  useEffect(() => {
    const joinParam = searchParams.get('join') as PlayerColor4 | null;
    const stored = localStorage.getItem(`chess4_color_${roomId}`) as PlayerColor4 | null;
    const resolved = joinParam || stored;
    if (resolved) {
      localStorage.setItem(`chess4_color_${roomId}`, resolved);
      setPlayerColor(resolved);
    }
  }, [roomId, searchParams]);

  const broadcastState = useCallback((state: GameState4) => {
    channelRef.current?.trigger('client-state4', { state });
  }, []);

  const checkEnd = useCallback((state: GameState4) => {
    const winner = getWinner4(state);
    if (winner) {
      setResultMsg(`${PLAYER_LABELS[winner]} venceu! 🏆`);
      setStatus('ended');
      return true;
    }
    return false;
  }, []);

  const applyState = useCallback((state: GameState4) => {
    setGameState(state);
    gameStateRef.current = state;
    if (!checkEnd(state)) {
      setStatus('playing');
    }
  }, [checkEnd]);

  // Pusher setup
  useEffect(() => {
    if (!playerColor) return;

    const userId = getUserId();
    const pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: { params: { user_id: userId } },
    });

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));

    const channel = pusher.subscribe(`presence-chess4-${roomId}`) as PresenceChannel;
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      setMemberCount(members.count);
      if (members.count >= 2) {
        setStatus('playing');
        // If red and others are here, send current state
        if (playerColorRef.current === 'red') {
          setTimeout(() => broadcastState(gameStateRef.current), 600);
        }
      }
    });

    channel.bind('pusher:member_added', () => {
      setMemberCount(prev => {
        const next = prev + 1;
        if (next >= 2) {
          setStatus('playing');
          // Red player syncs state whenever someone joins
          if (playerColorRef.current === 'red') {
            setTimeout(() => broadcastState(gameStateRef.current), 600);
          }
        }
        return next;
      });
    });

    channel.bind('pusher:member_removed', () => {
      setMemberCount(prev => Math.max(0, prev - 1));
    });

    // Receive state update from any player
    channel.bind('client-state4', ({ state }: { state: GameState4 }) => {
      applyState(state);
    });

    // Receive resign
    channel.bind('client-resign4', ({ color }: { color: PlayerColor4 }) => {
      setGameState(prev => {
        const newState = {
          ...prev,
          eliminated: [...prev.eliminated, color],
        };
        // Check winner after resignation
        const remaining = ['red', 'blue', 'yellow', 'green'].filter(
          c => !newState.eliminated.includes(c as PlayerColor4)
        ) as PlayerColor4[];
        if (remaining.length === 1) {
          setResultMsg(`${PLAYER_LABELS[remaining[0]]} venceu! 🏆`);
          setStatus('ended');
        } else {
          setResultMsg(`${PLAYER_LABELS[color]} desistiu.`);
        }
        return newState;
      });
    });

    return () => {
      pusher.unsubscribe(`presence-chess4-${roomId}`);
      pusher.disconnect();
    };
  }, [playerColor, roomId, broadcastState, applyState]);

  const handleMove = useCallback((from: [number, number], to: [number, number]) => {
    const state = gameStateRef.current;
    if (state.turn !== playerColorRef.current) return;

    const newState = makeMove4(state, from, to);
    setGameState(newState);
    gameStateRef.current = newState;

    broadcastState(newState);
    checkEnd(newState);
  }, [broadcastState, checkEnd]);

  const handleResign = () => {
    if (!playerColor || status !== 'playing') return;
    channelRef.current?.trigger('client-resign4', { color: playerColor });

    setGameState(prev => {
      const newElim = [...prev.eliminated, playerColor];
      const remaining = (['red', 'blue', 'yellow', 'green'] as PlayerColor4[]).filter(
        c => !newElim.includes(c)
      );
      if (remaining.length === 1) {
        setResultMsg(`${PLAYER_LABELS[remaining[0]]} venceu! 🏆`);
        setStatus('ended');
      } else {
        setResultMsg(`Você desistiu.`);
        setStatus('ended');
      }
      return { ...prev, eliminated: newElim };
    });
  };

  const copyInvite = (color: PlayerColor4) => {
    const url = `${window.location.origin}/game4/${roomId}?join=${color}`;
    navigator.clipboard.writeText(url);
    setCopied(color);
    setTimeout(() => setCopied(null), 2000);
  };

  const isMyTurn = status === 'playing' && gameState.turn === playerColor;

  // Waiting for color selection (joined without link)
  if (!playerColor) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: 'var(--surface)', border: '2px solid var(--border)',
          borderRadius: 20, padding: '36px 32px', maxWidth: 400, width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>♟</div>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8,
          }}>
            Escolha sua cor
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
            Sala: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{roomId}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(['blue', 'yellow', 'green'] as PlayerColor4[]).map(c => (
              <button
                key={c}
                onClick={() => {
                  localStorage.setItem(`chess4_color_${roomId}`, c);
                  setPlayerColor(c);
                }}
                style={{
                  padding: '12px 20px',
                  background: PLAYER_COLORS_CSS[c],
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {PLAYER_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const colorCss = PLAYER_COLORS_CSS[playerColor];
  const otherColors = (['red', 'blue', 'yellow', 'green'] as PlayerColor4[]).filter(c => c !== playerColor);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '16px',
    }}>
      {/* Header */}
      <header style={{
        width: '100%', maxWidth: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontSize: 22, cursor: 'pointer', fontFamily: 'Playfair Display, serif',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          ♟ <span style={{ fontSize: 16 }}>Xadrez 4 Jogadores</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px',
            color: 'var(--text-dim)', fontSize: 12,
          }}>
            Sala: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{roomId}</span>
          </div>
          <div style={{
            background: colorCss, borderRadius: 8, padding: '5px 12px',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>
            {PLAYER_LABELS[playerColor]}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        width: '100%', maxWidth: 900,
        display: 'flex', gap: 20,
        flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start',
      }}>
        {/* Board + overlays */}
        <div style={{ position: 'relative' }}>
          <ChessBoard4
            board={gameState.board}
            playerColor={playerColor}
            isMyTurn={isMyTurn}
            lastMove={gameState.lastMove}
            eliminated={gameState.eliminated}
            onMove={handleMove}
          />

          {/* Waiting overlay */}
          {status === 'waiting' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(13,11,9,0.9)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', gap: 16, zIndex: 50,
              padding: 24,
            }}>
              <div style={{ fontSize: 44 }}>⏳</div>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 20, fontWeight: 700, color: 'var(--gold)', textAlign: 'center',
              }}>
                Aguardando jogadores...
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
                {memberCount}/4 conectados · Compartilhe os links abaixo
              </div>

              {/* Invite links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
                {(['blue', 'yellow', 'green'] as PlayerColor4[]).map(c => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: `1px solid ${PLAYER_COLORS_CSS[c]}`,
                      borderRadius: 8, padding: '8px 12px',
                      fontSize: 12, color: 'var(--text-dim)',
                    }}>
                      <span style={{ color: PLAYER_COLORS_CSS[c], fontWeight: 700, marginRight: 6 }}>
                        {PLAYER_LABELS[c]}
                      </span>
                      …/game4/{roomId}?join={c}
                    </div>
                    <button
                      onClick={() => copyInvite(c)}
                      style={{
                        padding: '8px 12px',
                        background: copied === c ? 'rgba(74,222,128,0.15)' : 'var(--surface)',
                        border: `1px solid ${copied === c ? '#4ade80' : 'var(--border)'}`,
                        borderRadius: 8,
                        color: copied === c ? '#4ade80' : 'var(--text-dim)',
                        fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {copied === c ? '✓' : '⎘ Copiar'}
                    </button>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'var(--surface)', border: `1px solid var(--gold)`,
                borderRadius: 10, padding: '8px 20px',
                color: 'var(--gold)', fontWeight: 700, fontSize: 18,
                letterSpacing: '0.15em', fontFamily: 'DM Sans, monospace',
              }}>
                {roomId}
              </div>
            </div>
          )}

          {/* End overlay */}
          {status === 'ended' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(13,11,9,0.93)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', gap: 20, zIndex: 50,
            }}>
              <div style={{ fontSize: 56 }}>🏁</div>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 22, fontWeight: 900,
                color: 'var(--gold)', textAlign: 'center', maxWidth: 320,
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
                  cursor: 'pointer',
                }}
              >
                ← Novo Jogo
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Turn indicator */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Turno
            </div>
            {(['red', 'blue', 'yellow', 'green'] as PlayerColor4[]).map(c => {
              const isActive = gameState.turn === c && status === 'playing';
              const isElim = gameState.eliminated.includes(c);
              const isYou = c === playerColor;
              return (
                <div key={c} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 8, marginBottom: 4,
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: isActive ? `1px solid ${PLAYER_COLORS_CSS[c]}` : '1px solid transparent',
                  opacity: isElim ? 0.35 : 1,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: PLAYER_COLORS_CSS[c],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: isActive ? 700 : 400,
                    color: isActive ? PLAYER_COLORS_CSS[c] : 'var(--text-dim)',
                    flex: 1,
                  }}>
                    {PLAYER_LABELS[c]}{isYou ? ' (você)' : ''}
                  </span>
                  {isElim && <span style={{ fontSize: 11, color: '#f87171' }}>✕</span>}
                  {isActive && !isElim && <span style={{ fontSize: 11 }}>▸</span>}
                </div>
              );
            })}
          </div>

          {/* Status card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Status
            </div>
            <div style={{
              fontWeight: 600, fontSize: 14,
              color: status === 'ended' ? '#fca5a5' : isMyTurn ? '#4ade80' : 'var(--text)',
            }}>
              {status === 'waiting'
                ? '⏳ Aguardando jogadores'
                : status === 'ended'
                ? '🏁 Fim de partida'
                : isMyTurn
                ? '♟ Sua vez!'
                : `⌛ Vez de ${PLAYER_LABELS[gameState.turn]}`}
            </div>
          </div>

          {/* Players connected */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Sala
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i <= memberCount ? '#4ade80' : 'var(--border)',
                  boxShadow: i <= memberCount ? '0 0 4px #4ade80' : 'none',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {memberCount}/4 jogadores
            </div>
          </div>

          {/* Resign */}
          {status === 'playing' && !gameState.eliminated.includes(playerColor) && (
            <button
              onClick={handleResign}
              style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid rgba(248,113,113,0.4)',
                borderRadius: 10,
                color: '#f87171',
                fontSize: 13, fontWeight: 600,
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function Game4Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: 18 }}>Carregando...</div>
      </div>
    }>
      <Game4Inner />
    </Suspense>
  );
}
