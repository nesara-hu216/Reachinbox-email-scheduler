'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { EmailJob } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface SentTableProps {
  jobs: EmailJob[] | undefined;
  isLoading: boolean;
}

export function SentTable({ jobs, isLoading }: SentTableProps) {
  const [selectedErrorJob, setSelectedErrorJob] = useState<EmailJob | null>(null);

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
        <div className="h-12 w-12 rounded-full bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-slate-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No sent emails yet</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Delivered emails and test Nodemailer preview links will appear here after workers dispatch them.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Recipient</th>
              <th className="px-5 py-3.5">Subject</th>
              <th className="px-5 py-3.5">Sent / Processed Time</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-4 font-medium text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{job.recipient}</span>
                </td>
                <td className="px-5 py-4 text-slate-200">
                  <span className="truncate max-w-[260px] block font-medium">{job.subject}</span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-slate-400">
                  {formatDate(job.sentAt || job.updatedAt)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <Badge status={job.status} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {job.etherealPreviewUrl ? (
                    <a
                      href={job.etherealPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-lg border border-brand-500/30 transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View Email
                    </a>
                  ) : job.status === 'FAILED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedErrorJob(job)}
                      className="text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1" /> Error Info
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No Preview</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error Info Modal */}
      <Modal
        isOpen={!!selectedErrorJob}
        onClose={() => setSelectedErrorJob(null)}
        title="Email Delivery Error Details"
      >
        {selectedErrorJob && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <p className="font-semibold mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Last Exception Message:
              </p>
              <pre className="text-xs bg-slate-950/80 p-3 rounded-lg overflow-x-auto text-slate-200 mt-2 font-mono">
                {selectedErrorJob.lastError || 'Unknown SMTP error'}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Recipient:</span> {selectedErrorJob.recipient}
              </div>
              <div>
                <span className="text-slate-500">Attempts:</span> {selectedErrorJob.attempts} / 3
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
