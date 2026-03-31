'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomId } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');

  const createGame = () => {
    const roomId = generateRoomId();
    localStorage.setItem(`chess_color_${roomId}`, 'white');
    router.push(`/game/${roomId}`);
  };

  const joinGame = () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, '');
    if (code.length < 4) return;
    localStorage.setItem(`chess_color_${code}`, 'black');
    router.push(`/game/${code}`);
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Background chess pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `repeating-conic-gradient(#c9a84c 0% 25%, transparent 0% 50%)`,
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
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

        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 64 }} className="animate-fadein">
          <div style={{ fontSize: 56, marginBottom: 12 }}>♟</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 16,
          }} className="shimmer-gold">
            Xadrez Online
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 16, fontWeight: 400, letterSpacing: '0.05em' }}>
            Jogue com seu amigo • Tempo real • Gratuito
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
          maxWidth: 640, width: '100%',
        }} className="animate-fadein">

          {/* Create Game */}
          {mode === 'menu' && (
            <>
              <button
                onClick={createGame}
                style={{
                  flex: 1, minWidth: 240, padding: '32px 28px',
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
                <div style={{ fontSize: 32, marginBottom: 12 }}>♔</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 22, fontWeight: 700,
                  color: '#1a1200', marginBottom: 8,
                }}>
                  Criar Partida
                </div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                  Gere um código e compartilhe com seu amigo para começar a jogar.
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                style={{
                  flex: 1, minWidth: 240, padding: '32px 28px',
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
                <div style={{ fontSize: 32, marginBottom: 12 }}>♟</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 22, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  Entrar na Partida
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  Insira o código que seu amigo compartilhou para entrar na sala.
                </div>
              </button>
            </>
          )}

          {/* Join Form */}
          {mode === 'join' && (
            <div style={{
              width: '100%', maxWidth: 400,
              background: 'var(--surface)', border: '2px solid var(--border)',
              borderRadius: 20, padding: '36px 32px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }} className="animate-fadein">
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>♟</div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 24, fontWeight: 700, color: 'var(--text)',
                }}>
                  Entrar na Partida
                </div>
              </div>

              <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: 12, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
                Código da sala
              </label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinGame()}
                placeholder="Ex: A3K9PQ"
                maxLength={8}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg)', border: '2px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 22,
                  fontFamily: 'DM Sans, monospace', letterSpacing: '0.15em',
                  fontWeight: 600, textAlign: 'center',
                  outline: 'none', marginBottom: 20,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />

              <button
                onClick={joinGame}
                disabled={joinCode.trim().length < 4}
                style={{
                  width: '100%', padding: '14px',
                  background: joinCode.trim().length >= 4
                    ? 'linear-gradient(135deg, #c9a84c, #a07828)'
                    : 'var(--bg3)',
                  border: 'none', borderRadius: 10, cursor: joinCode.trim().length >= 4 ? 'pointer' : 'not-allowed',
                  color: joinCode.trim().length >= 4 ? '#1a1200' : 'var(--text-dim)',
                  fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
                  transition: 'opacity 0.2s',
                  marginBottom: 12,
                }}
              >
                Entrar →
              </button>

              <button
                onClick={() => { setMode('menu'); setJoinCode(''); }}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent', border: 'none',
                  color: 'var(--text-dim)', fontSize: 14,
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
        {mode === 'menu' && (
          <div style={{
            marginTop: 64, display: 'flex', gap: 32, flexWrap: 'wrap',
            justifyContent: 'center', maxWidth: 640,
          }} className="animate-fadein">
            {[
              { n: '1', t: 'Criar', d: 'Clique em "Criar Partida" e receba seu código único' },
              { n: '2', t: 'Compartilhar', d: 'Envie o link ou código para seu amigo' },
              { n: '3', t: 'Jogar', d: 'Quando seu amigo entrar, a partida começa automaticamente' },
            ].map(({ n, t, d }) => (
              <div key={n} style={{
                textAlign: 'center', flex: 1, minWidth: 160, maxWidth: 200,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'var(--surface)', border: '1px solid var(--gold-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--gold)', fontWeight: 700, fontSize: 16,
                  fontFamily: 'Playfair Display, serif',
                }}>{n}</div>
                <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{t}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 56, color: 'var(--text-dim)', fontSize: 12, letterSpacing: '0.05em' }}>
          Powered by Next.js · Pusher · chess.js
        </p>
      </div>
    </main>
  );
}
