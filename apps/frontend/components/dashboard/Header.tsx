'use client';

import React from 'react';
import { Send, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Button';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-header px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-800">
      {/* Brand Branding */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-600/30">
          <Send className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white tracking-tight">ReachInbox</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Outreach Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Production Email Scheduling System</p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 bg-slate-900/80 p-1.5 pr-3 rounded-full border border-slate-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-500/40"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 border border-brand-500/40">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-full" />
        )}
      </div>
    </header>
  );
}
