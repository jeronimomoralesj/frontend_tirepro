import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agentes · TirePro',
  description: 'Automatiza acciones con inteligencia artificial.',
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
