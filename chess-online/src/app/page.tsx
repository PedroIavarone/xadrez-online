'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomId } from '@/lib/utils';

type GameMode = '2p' | '4p';
type TimePreset = 'bullet' | 'blitz' | 'default' | 'custom';

const TIME_PRESETS: Record<TimePreset, { label: string; minutes: number | null; desc: string }> = {
  bullet:  { label: 'Bullet',     minutes: 1,    desc: '1 minuto' },
  blitz:   { label: 'Blitz',      minutes: 3,    desc: '3 minutos' },
  default: { label: 'Padrão',     minutes: 10,   desc: '10 minutos' },
  custom:  { label: 'Livre',      minutes: null, desc: 'Escolha o tempo' },
};

export default function Home() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode>('2p');
  const [view, setView] = useState<'menu' | 'join'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [joinColor4, setJoinColor4] = useState<string>('blue');
  const [timePreset, setTimePreset] = useState<TimePreset>('default');
  const [customMinutes, setCustomMinutes] = useState('10');

  const getSelectedTime = (): number => {
    if (timePreset === 'custom') {
      const mins = parseInt(customMinutes);
      return (isNaN(mins) || mins < 1 ? 10 : Math.min(mins, 180)) * 60 * 1000;
    }
    return (TIME_PRESETS[timePreset].minutes ?? 10) * 60 * 1000;
  };

  const createGame2p = () => {
    const roomId = generateRoomId();
    const time = getSelectedTime();
    localStorage.setItem(`chess_color_${roomId}`, 'white');
    localStorage.setItem(`chess_time_${roomId}`, String(time));
    router.push(`/game/${roomId}`);
  };

  const createGame4p = () => {
    const roomId = generateRoomId();
    localStorage.setItem(`chess4_color_${roomId}`, 'red');
    router.push(`/game4/${roomId}`);
  };

  const joinGame2p = () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, '');
    if (code.length < 4) return;
    localStorage.setItem(`chess_color_${code}`, 'black');
    router.push(`/game/${code}`);
  };

  const joinGame4p = () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, '');
    if (code.length < 4) return;
    router.push(`/game4/${code}?join=${joinColor4}`);
  };

  const joinGame = () => gameMode === '2p' ? joinGame2p() : joinGame4p();

  const labelMap: Record<string, string> = { blue: 'Azul', yellow: 'Amarelo', green: 'Verde' };
  const colorCssMap: Record<string, string> = { blue: '#2563eb', yellow: '#ca8a04', green: '#16a34a' };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Background chess pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `repeating-conic-gradient(#c9a84c 0% 25%, transparent 0% 50%)`,
        backgroundSize: '80px 80px', pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '40px 20px',
      }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }} className="animate-fadein">
          <div style={{ fontSize: 52, marginBottom: 10 }}>♟</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(2.2rem, 6vw, 3.6rem)',
            fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 14,
          }} className="shimmer-gold">
            Xadrez Online
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, fontWeight: 400, letterSpacing: '0.05em' }}>
            Jogue com seus amigos · Tempo real · Gratuito
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 28,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, overflow: 'hidden',
        }} className="animate-fadein">
          {([['2p', '2 Jogadores', '♟'], ['4p', '4 Jogadores', '♛']] as [GameMode, string, string][]).map(([m, label, icon]) => (
            <button
              key={m}
              onClick={() => { setGameMode(m); setView('menu'); }}
              style={{
                padding: '10px 24px', border: 'none', borderRadius: 9,
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
                transition: 'all 0.2s',
                background: gameMode === m
                  ? 'linear-gradient(135deg, #c9a84c 0%, #a07828 100%)'
                  : 'transparent',
                color: gameMode === m ? '#1a1200' : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 20, maxWidth: 640, width: '100%',
        }} className="animate-fadein">

          {/* Time controls (2p only, menu view) */}
          {gameMode === '2p' && view === 'menu' && (
            <div style={{
              width: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Controle de Tempo
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.entries(TIME_PRESETS) as [TimePreset, typeof TIME_PRESETS[TimePreset]][]).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setTimePreset(key)}
                    style={{
                      padding: '8px 16px', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      transition: 'all 0.2s',
                      background: timePreset === key
                        ? 'linear-gradient(135deg, #c9a84c, #a07828)'
                        : 'var(--bg3)',
                      color: timePreset === key ? '#1a1200' : 'var(--text-dim)',
                    }}
                  >
                    {p.label}
                    <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 4, opacity: 0.75 }}>
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
              {timePreset === 'custom' && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={e => setCustomMinutes(e.target.value)}
                    min={1} max={180}
                    style={{
                      width: 80, padding: '8px 10px',
                      background: 'var(--bg)', border: '2px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', fontSize: 16,
                      textAlign: 'center', outline: 'none',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>minutos por jogador</span>
                </div>
              )}
            </div>
          )}

          {/* Menu view: Create + Join buttons */}
          {view === 'menu' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={gameMode === '2p' ? createGame2p : createGame4p}
                style={{
                  flex: 1, minWidth: 220, padding: '28px 24px',
                  background: 'linear-gradient(135deg, #c9a84c 0%, #a07828 100%)',
                  border: 'none', borderRadius: 16, cursor: 'pointer',
                  textAlign: 'left', transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 8px 32px rgba(201,168,76,0.25)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(201,168,76,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(201,168,76,0.25)';
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 10 }}>
                  {gameMode === '4p' ? '♛' : '♔'}
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: '#1a1200', marginBottom: 6 }}>
                  Criar Partida
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                  {gameMode === '4p'
                    ? 'Crie uma sala para até 4 jogadores e compartilhe os links.'
                    : 'Gere um código e compartilhe com seu amigo.'}
                </div>
              </button>

              <button
                onClick={() => setView('join')}
                style={{
                  flex: 1, minWidth: 220, padding: '28px 24px',
                  background: 'var(--surface)',
                  border: '2px solid var(--border)', borderRadius: 16, cursor: 'pointer',
                  textAlign: 'left', transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 10 }}>♟</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Entrar na Partida
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  Insira o código da sala para entrar na partida.
                </div>
              </button>
            </div>
          )}

          {/* Join view */}
          {view === 'join' && (
            <div style={{
              width: '100%', maxWidth: 420,
              background: 'var(--surface)', border: '2px solid var(--border)',
              borderRadius: 20, padding: '32px 28px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }} className="animate-fadein">
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>♟</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 22, fontWeight: 700, color: 'var(--text)',
                }}>
                  Entrar na Partida
                </div>
                {gameMode === '4p' && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Modo 4 Jogadores
                  </div>
                )}
              </div>

              <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                Código da sala
              </label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinGame()}
                placeholder="Ex: A3K9PQ"
                maxLength={8}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg)', border: '2px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 20,
                  fontFamily: 'DM Sans, monospace', letterSpacing: '0.15em',
                  fontWeight: 600, textAlign: 'center',
                  outline: 'none', marginBottom: 16,
                  transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />

              {/* Color picker for 4p */}
              {gameMode === '4p' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
                    Sua cor
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['blue', 'yellow', 'green'] as string[]).map(c => (
                      <button
                        key={c}
                        onClick={() => setJoinColor4(c)}
                        style={{
                          flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
                          cursor: 'pointer', fontWeight: 700, fontSize: 12,
                          background: joinColor4 === c ? colorCssMap[c] : 'var(--bg3)',
                          color: joinColor4 === c ? '#fff' : 'var(--text-dim)',
                          outline: joinColor4 === c ? `2px solid ${colorCssMap[c]}` : 'none',
                          outlineOffset: 2, transition: 'all 0.2s',
                        }}
                      >
                        {labelMap[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={joinGame}
                disabled={joinCode.trim().length < 4}
                style={{
                  width: '100%', padding: '13px',
                  background: joinCode.trim().length >= 4
                    ? 'linear-gradient(135deg, #c9a84c, #a07828)'
                    : 'var(--bg3)',
                  border: 'none', borderRadius: 10,
                  cursor: joinCode.trim().length >= 4 ? 'pointer' : 'not-allowed',
                  color: joinCode.trim().length >= 4 ? '#1a1200' : 'var(--text-dim)',
                  fontSize: 14, fontWeight: 700, letterSpacing: '0.05em',
                  marginBottom: 10, boxSizing: 'border-box',
                }}
              >
                Entrar →
              </button>

              <button
                onClick={() => { setView('menu'); setJoinCode(''); }}
                style={{
                  width: '100%', padding: '9px',
                  background: 'transparent', border: 'none',
                  color: 'var(--text-dim)', fontSize: 13,
                  cursor: 'pointer', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                ← Voltar
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        {view === 'menu' && (
          <div style={{
            marginTop: 52, display: 'flex', gap: 28, flexWrap: 'wrap',
            justifyContent: 'center', maxWidth: 640,
          }} className="animate-fadein">
            {(gameMode === '2p'
              ? [
                  { n: '1', t: 'Criar', d: 'Clique em "Criar Partida" e receba seu código único' },
                  { n: '2', t: 'Compartilhar', d: 'Envie o código para seu amigo entrar' },
                  { n: '3', t: 'Jogar', d: 'Quando seu amigo entrar, a partida começa' },
                ]
              : [
                  { n: '1', t: 'Criar Sala', d: 'Crie a sala como Vermelho' },
                  { n: '2', t: 'Convidar', d: 'Compartilhe links de cor para cada amigo' },
                  { n: '3', t: 'Jogar', d: 'Partida começa com 2+ jogadores conectados' },
                ]
            ).map(({ n, t, d }) => (
              <div key={n} style={{ textAlign: 'center', flex: 1, minWidth: 150, maxWidth: 200 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', margin: '0 auto 10px',
                  background: 'var(--surface)', border: '1px solid var(--gold-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--gold)', fontWeight: 700, fontSize: 15,
                  fontFamily: 'Playfair Display, serif',
                }}>{n}</div>
                <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 5, fontSize: 13 }}>{t}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 52, color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.05em' }}>
          Powered by Next.js · Pusher · chess.js
        </p>
      </div>
    </main>
  );
}
