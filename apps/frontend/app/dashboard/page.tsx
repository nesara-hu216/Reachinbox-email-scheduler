'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Clock, CheckCircle2, Search, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../../components/dashboard/Header';
import { StatsCards } from '../../components/dashboard/StatsCards';
import { ScheduledTable } from '../../components/dashboard/ScheduledTable';
import { SentTable } from '../../components/dashboard/SentTable';
import { ComposeEmailModal } from '../../components/compose/ComposeEmailModal';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { User } from '../../types';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // 1. User Auth Query
  const { data: user, isLoading: isUserLoading, error: userError } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    retry: false,
  });

  useEffect(() => {
    if (userError) {
      toast.error('Session expired. Redirecting to login.');
      router.push('/');
    }
  }, [userError, router]);

  // 2. Stats Summary Query (Auto-refetches every 5 seconds for live processing updates)
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 5000,
    enabled: !!user,
  });

  // 3. Scheduled Emails Query
  const { data: scheduledData, isLoading: isScheduledLoading } = useQuery({
    queryKey: ['scheduledEmails', page, search],
    queryFn: () => api.getScheduledEmails(page, search),
    refetchInterval: 5000,
    enabled: !!user && activeTab === 'scheduled',
  });

  // 4. Sent Emails Query
  const { data: sentData, isLoading: isSentLoading } = useQuery({
    queryKey: ['sentEmails', page, search],
    queryFn: () => api.getSentEmails(page, search),
    refetchInterval: 5000,
    enabled: !!user && activeTab === 'sent',
  });

  const handleLogout = async () => {
    try {
      await api.logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    toast.info('Refreshed job statuses');
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading ReachInbox Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <Header user={user || null} onLogout={handleLogout} />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Page Heading & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Email Scheduler</h1>
            <p className="text-sm text-slate-400 mt-1">
              Schedule, monitor, and manage your outbound email outreach queues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>

            <Button onClick={() => setIsComposeOpen(true)} size="lg" className="shadow-brand-600/30">
              <Plus className="h-5 w-5 mr-2" /> Compose New Email
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <StatsCards stats={stats} isLoading={isStatsLoading} />

        {/* Tabs & Search Header */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
            {/* Tab Toggle */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('scheduled');
                  setPage(1);
                }}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'scheduled'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                Scheduled Emails
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px]">
                  {(stats?.scheduled ?? 0) + (stats?.processing ?? 0)}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sent');
                  setPage(1);
                }}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'sent'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Sent Emails
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px]">
                  {(stats?.sent ?? 0) + (stats?.failed ?? 0)}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Active Tab Table Content */}
          {activeTab === 'scheduled' ? (
            <ScheduledTable
              jobs={scheduledData?.jobs}
              isLoading={isScheduledLoading}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          ) : (
            <SentTable jobs={sentData?.jobs} isLoading={isSentLoading} />
          )}

          {/* Pagination Footer */}
          {activeTab === 'scheduled' && scheduledData && scheduledData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-slate-400 pt-4 border-t border-slate-800">
              <span>
                Page {scheduledData.pagination.page} of {scheduledData.pagination.totalPages} (Total {scheduledData.pagination.total} jobs)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= scheduledData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'sent' && sentData && sentData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-slate-400 pt-4 border-t border-slate-800">
              <span>
                Page {sentData.pagination.page} of {sentData.pagination.totalPages} (Total {sentData.pagination.total} jobs)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= sentData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Compose Email Modal */}
      <ComposeEmailModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} />
    </div>
  );
}
