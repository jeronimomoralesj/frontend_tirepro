import type { Metadata } from 'next';
import { ChatShell } from '@/components/chat/ChatShell';

export const metadata: Metadata = {
  title: 'Ana · TirePro',
  description: 'Tu analista de llantas con inteligencia artificial.',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatShell>{children}</ChatShell>;
}
