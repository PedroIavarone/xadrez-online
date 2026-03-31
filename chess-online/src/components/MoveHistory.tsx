'use client';
import { useEffect, useRef } from 'react';

interface Props {
  moves: string[];
}

export default function MoveHistory({ moves }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves]);

  const pairs: [string, string?][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '4px 0',
      maxHeight: 280,
    }}>
      {pairs.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '8px 0', textAlign: 'center' }}>
          Nenhum movimento ainda
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {pairs.map(([white, black], i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                borderRadius: 4,
              }}>
                <td style={{ color: 'var(--text-dim)', paddingRight: 8, paddingTop: 4, paddingBottom: 4, width: 28, fontSize: 12, textAlign: 'right' }}>
                  {i + 1}.
                </td>
                <td style={{ color: 'var(--text)', paddingRight: 16, fontWeight: 500, paddingTop: 4, paddingBottom: 4, width: '50%' }}>
                  {white}
                </td>
                <td style={{ color: 'var(--text-dim)', paddingTop: 4, paddingBottom: 4 }}>
                  {black ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div ref={endRef} />
    </div>
  );
}
