import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xadrez Online',
  description: 'Jogue xadrez com seus amigos em tempo real',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
