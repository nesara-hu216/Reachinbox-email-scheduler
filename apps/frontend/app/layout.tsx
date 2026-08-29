import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler | Outreach Automation Engine',
  description:
    'Production-Grade Email Scheduler with delayed BullMQ job processing, atomic Redis rate limiting, persistent PostgreSQL job storage, and Ethereal SMTP integration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen custom-scrollbar">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
