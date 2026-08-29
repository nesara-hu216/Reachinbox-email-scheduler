'use client';

import React from 'react';
import { Mail, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatsSummary } from '../../types';

interface StatsCardsProps {
  stats: StatsSummary | undefined;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Emails',
      value: stats?.total ?? 0,
      icon: Mail,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Scheduled / Processing',
      value: (stats?.scheduled ?? 0) + (stats?.processing ?? 0),
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Successfully Sent',
      value: stats?.sent ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Failed Delivery',
      value: stats?.failed ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-card rounded-2xl p-5 border transition-all hover:border-slate-700/80 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-400 tracking-wide">{card.title}</p>
              {isLoading ? (
                <div className="h-7 w-16 bg-slate-800 animate-pulse rounded-md mt-2" />
              ) : (
                <p className="text-2xl font-extrabold text-white mt-1">{card.value.toLocaleString()}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl border ${card.bg}`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
