'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertTriangle, Trash2, Users, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface FileUploaderProps {
  onRecipientsParsed: (emails: string[]) => void;
  recipients: string[];
  setRecipients: React.Dispatch<React.SetStateAction<string[]>>;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function FileUploader({ onRecipientsParsed, recipients, setRecipients }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    detected: number;
    invalid: number;
    duplicates: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileContent = (content: string, name: string) => {
    setFileName(name);
    let rawEmails: string[] = [];

    // Parse CSV or TXT
    if (name.endsWith('.csv')) {
      const parsed = Papa.parse<any>(content, { header: true, skipEmptyLines: true });
      if (parsed.data && parsed.data.length > 0) {
        parsed.data.forEach((row: any) => {
          // Look for any key containing "email" or first column value
          const keys = Object.keys(row);
          const emailKey = keys.find((k) => k.toLowerCase().includes('email')) || keys[0];
          if (emailKey && row[emailKey]) {
            rawEmails.push(String(row[emailKey]).trim());
          }
        });
      } else {
        // Fallback for plain unheaded CSV
        const plainParsed = Papa.parse<string[]>(content, { skipEmptyLines: true });
        plainParsed.data.forEach((row) => {
          row.forEach((cell) => rawEmails.push(cell.trim()));
        });
      }
    } else {
      // TXT file line by line
      const lines = content.split(/\r?\n/);
      lines.forEach((line) => {
        const matches = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
          rawEmails.push(...matches);
        }
      });
    }

    const totalDetected = rawEmails.length;
    let invalidCount = 0;
    const validSet = new Set<string>();

    rawEmails.forEach((email) => {
      const cleaned = email.trim().toLowerCase();
      if (EMAIL_REGEX.test(cleaned)) {
        validSet.add(cleaned);
      } else {
        invalidCount++;
      }
    });

    const uniqueValid = Array.from(validSet);
    const duplicatesCount = totalDetected - invalidCount - uniqueValid.length;

    setStats({
      detected: totalDetected,
      invalid: invalidCount,
      duplicates: Math.max(0, duplicatesCount),
    });

    setRecipients(uniqueValid);
    onRecipientsParsed(uniqueValid);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const removeRecipient = (indexToRemove: number) => {
    const updated = recipients.filter((_, idx) => idx !== indexToRemove);
    setRecipients(updated);
    onRecipientsParsed(updated);
  };

  return (
    <div className="space-y-4">
      {/* File Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="h-10 w-10 rounded-xl bg-slate-800 text-brand-400 flex items-center justify-center mx-auto mb-3 border border-slate-700">
          <Upload className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white">
          Click or drag & drop lead list (.csv or .txt)
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Supports header CSV (name,email) or plain TXT email lists
        </p>
      </div>

      {/* Detection Stats Pill */}
      {stats && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-200">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {fileName} uploaded
            </span>
            <span className="text-brand-400 font-bold">{recipients.length} Ready to Schedule</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            <div className="bg-slate-950 p-2 rounded-lg">
              <p className="text-slate-500 text-[10px]">Total Detected</p>
              <p className="font-bold text-slate-200 text-sm">{stats.detected}</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg">
              <p className="text-slate-500 text-[10px]">Invalid Emails</p>
              <p className="font-bold text-rose-400 text-sm">{stats.invalid}</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg">
              <p className="text-slate-500 text-[10px]">Duplicates Removed</p>
              <p className="font-bold text-amber-400 text-sm">{stats.duplicates}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Tag List Preview */}
      {recipients.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Recipients Preview ({recipients.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setRecipients([]);
                setStats(null);
                setFileName(null);
              }}
              className="text-rose-400 hover:underline text-[11px]"
            >
              Clear List
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto custom-scrollbar p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap gap-1.5">
            {recipients.map((email, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-800"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(idx)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
