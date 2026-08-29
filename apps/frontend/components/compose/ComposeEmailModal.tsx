'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Clock, AlertTriangle, ShieldCheck, Calendar, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FileUploader } from './FileUploader';
import { api } from '../../lib/api';
import { ScheduleRequest } from '../../types';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComposeEmailModal({ isOpen, onClose }: ComposeEmailModalProps) {
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipientInput, setManualRecipientInput] = useState('');

  // Default start time: current time + 1 minute formatted for datetime-local
  const getDefaultStartTime = () => {
    const d = new Date(Date.now() + 60000);
    d.setSeconds(0, 0);
    // Format to YYYY-MM-THH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localIso;
  };

  const [startTimeLocal, setStartTimeLocal] = useState<string>(getDefaultStartTime());
  const [delaySec, setDelaySec] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  // Fetch senders query
  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: () => api.getSenders(),
    enabled: isOpen,
  });

  // Schedule campaign mutation
  const scheduleMutation = useMutation({
    mutationFn: (data: ScheduleRequest) => api.createCampaign(data),
    onSuccess: (res) => {
      toast.success(
        `Campaign scheduled! ${res.scheduledCount} email jobs added to delayed BullMQ queue.`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries({ queryKey: ['scheduledEmails'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      // Reset form
      setSubject('');
      setBody('');
      setRecipients([]);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to schedule campaign');
    },
  });

  // Handle adding manual email input
  const addManualEmail = () => {
    if (!manualRecipientInput.trim()) return;
    const items = manualRecipientInput
      .split(/[\n,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));

    if (items.length === 0) {
      toast.error('Please enter a valid email address (e.g. user@example.com)');
      return;
    }

    const updated = Array.from(new Set([...recipients, ...items]));
    setRecipients(updated);
    setManualRecipientInput('');
  };

  // Parse pending typed email input automatically so typing enables the schedule button immediately
  const pendingInputEmails = manualRecipientInput
    .split(/[\n,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));

  const effectiveRecipients = Array.from(new Set([...recipients, ...pendingInputEmails]));
  const totalCount = effectiveRecipients.length;

  const startMs = startTimeLocal ? new Date(startTimeLocal).getTime() : Date.now();
  const delayMs = delaySec * 1000;

  // Calculate estimated completion
  let estimatedEndMs = startMs;
  let hasHourlySpillover = false;
  let totalWindows = 1;

  if (totalCount > 0) {
    totalWindows = Math.ceil(totalCount / hourlyLimit);
    hasHourlySpillover = totalWindows > 1;

    // Last recipient calculation
    const lastIndex = totalCount - 1;
    const windowIndex = Math.floor(lastIndex / hourlyLimit);
    const positionInWindow = lastIndex % hourlyLimit;
    estimatedEndMs = startMs + windowIndex * 3600000 + positionInWindow * delayMs;
  }

  const estimatedEndTimeFormatted = new Date(estimatedEndMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter the email body');
      return;
    }

    // Auto-process any text currently in the manual input field
    let finalRecipients = [...recipients];
    if (manualRecipientInput.trim()) {
      const items = manualRecipientInput
        .split(/[\n,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));
      finalRecipients = Array.from(new Set([...finalRecipients, ...items]));
    }

    if (finalRecipients.length === 0) {
      toast.error('Please enter or upload at least one recipient email');
      return;
    }

    const startTimeIso = new Date(startTimeLocal).toISOString();

    scheduleMutation.mutate({
      subject,
      body,
      recipients: finalRecipients,
      startTime: startTimeIso,
      delayBetweenEmails: delayMs,
      hourlyLimit,
      senderId: selectedSenderId || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Outbound Campaign"
      subtitle="Configure persistent delayed queue dispatching with Redis-backed rate limiting."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Sender & Email Content */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Sender Account
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="">Default Primary Ethereal Sender</option>
                {senders?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                placeholder="e.g. Accelerate your outbound campaigns with ReachInbox"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Hi {{name}}, I would love to connect regarding..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 custom-scrollbar resize-none"
              required
            />
          </div>
        </div>

        {/* Section 2: Recipients Upload */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Target Recipients List
          </label>
          <FileUploader
            onRecipientsParsed={(parsed) => setRecipients(parsed)}
            recipients={recipients}
            setRecipients={setRecipients}
          />

          {/* Quick Manual Email Input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Or paste emails manually (e.g. john@ex.com, jane@ex.com)..."
              value={manualRecipientInput}
              onChange={(e) => setManualRecipientInput(e.target.value)}
              onBlur={addManualEmail}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addManualEmail();
                }
              }}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addManualEmail}>
              Add Email
            </Button>
          </div>
        </div>

        {/* Section 3: Scheduling Controls */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-brand-400" /> Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startTimeLocal}
              onChange={(e) => setStartTimeLocal(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Min Delay (Sec)
            </label>
            <input
              type="number"
              min={1}
              value={delaySec}
              onChange={(e) => setDelaySec(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Hourly Send Limit
            </label>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            />
          </div>
        </div>

        {/* Schedule Calculation Preview Banner */}
        {totalCount > 0 && (
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs space-y-1 text-slate-200">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-brand-300">
                <Clock className="h-4 w-4" /> Estimated Dispatch Completion:
              </span>
              <span className="text-white font-bold">{estimatedEndTimeFormatted}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {totalCount} email{totalCount > 1 ? 's' : ''} scheduled with {delaySec}s delay. Max{' '}
              {hourlyLimit} emails/hour per sender.
            </p>
            {hasHourlySpillover && (
              <div className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold pt-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Rate Limit Warning: Recipient
                volume spans across {totalWindows} hourly windows. BullMQ worker will automatically
                delay remaining jobs into subsequent hours.
              </div>
            )}
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={scheduleMutation.isPending || totalCount === 0}>
            {scheduleMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Scheduling Jobs...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Schedule {totalCount} Email
                {totalCount === 1 ? '' : 's'}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
