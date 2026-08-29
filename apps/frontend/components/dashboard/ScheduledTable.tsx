'use client';

import React from 'react';
import { Mail, Clock, Send, RefreshCw } from 'lucide-react';
import { EmailJob } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ScheduledTableProps {
  jobs: EmailJob[] | undefined;
  isLoading: boolean;
  onOpenCompose: () => void;
}

export function ScheduledTable({ jobs, isLoading, onOpenCompose }: ScheduledTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-slate-900/60 animate-pulse rounded-xl border border-slate-800" />
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 my-4">
        <div className="h-12 w-12 rounded-full bg-slate-800/80 text-brand-400 flex items-center justify-center mx-auto mb-4 border border-slate-700">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No scheduled emails yet</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Schedule hundreds or thousands of outreach emails with persistent BullMQ delay queues and automatic rate limiting.
        </p>
        <Button onClick={onOpenCompose}>
          <Send className="h-4 w-4 mr-2" /> Schedule Your First Email
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
          <tr>
            <th className="px-5 py-3.5">Recipient</th>
            <th className="px-5 py-3.5">Subject</th>
            <th className="px-5 py-3.5">Scheduled Time</th>
            <th className="px-5 py-3.5">Sender</th>
            <th className="px-5 py-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-5 py-4 font-medium text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400 shrink-0" />
                <span className="truncate max-w-[200px]">{job.recipient}</span>
              </td>
              <td className="px-5 py-4 text-slate-200">
                <span className="truncate max-w-[260px] block font-medium">{job.subject}</span>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-slate-400">
                {formatDate(job.scheduledAt)}
              </td>
              <td className="px-5 py-4 text-slate-400 text-xs">
                {job.sender?.email || job.senderId}
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <Badge status={job.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
