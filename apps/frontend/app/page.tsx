'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Clock, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'connected_oauth_ready' | 'connected_oauth_needed' | 'error'
  >('checking');

  useEffect(() => {
    // Check URL query parameters for OAuth failure redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'auth_failed' || params.get('error') === 'oauth_failed') {
        toast.error('Google OAuth authentication failed or was cancelled. Please try again.');
      }
    }

    // Check backend API connectivity via GET /api/health
    api
      .getHealth()
      .then((res) => {
        if (res.oauth?.google === 'configured') {
          setBackendStatus('connected_oauth_ready');
        } else {
          setBackendStatus('connected_oauth_needed');
        }
      })
      .catch(() => setBackendStatus('error'));

    // Check if user is already authenticated
    api
      .getMe()
      .then((user) => {
        if (user) {
          router.push('/dashboard');
        }
      })
      .catch((err) => {
        if (err?.code === 'NETWORK_ERROR') {
          toast.error('Unable to connect to backend server. Make sure backend is running at http://localhost:4000');
        }
      });
  }, [router]);

  const handleGoogleLogin = () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      await api.devLogin('demo@reachinbox.com', 'ReachInbox Demo User');
      toast.success('Logged in as ReachInbox Demo User!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Dev login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Dynamic Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header Logo & Diagnostic Status Pill */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Send className="h-5 w-5 text-white" />
          </div>
          <span className="font-extrabold text-xl text-white tracking-tight">ReachInbox</span>
        </div>

        {/* Health Status Pill */}
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
          {backendStatus === 'checking' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-slate-400">Checking API...</span>
            </>
          ) : backendStatus === 'connected_oauth_ready' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400">Backend Connected (Google OAuth Ready)</span>
            </>
          ) : backendStatus === 'connected_oauth_needed' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-amber-400">Backend Connected — Google OAuth Needs Keys in .env</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="text-rose-400">Backend Unavailable at http://localhost:4000</span>
            </>
          )}
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="max-w-md w-full mx-auto my-auto z-10">
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl text-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-600/20">
            <Send className="h-7 w-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            ReachInbox Scheduler
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Email outreach, scheduled smarter. Powered by persistent BullMQ queues & Redis atomic rate limiting.
          </p>

          <div className="space-y-3">
            {/* Real Google OAuth Login Button */}
            <Button
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-semibold shadow-xl flex items-center justify-center gap-3 rounded-xl transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Development Fallback Login */}
            <Button
              variant="outline"
              onClick={handleDevLogin}
              disabled={loading}
              className="w-full h-11 text-xs text-slate-300 border-slate-800 hover:bg-slate-800/60"
            >
              {loading ? 'Authenticating...' : 'Enter Demo Workspace (Development Fallback)'}
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4 text-brand-400" />
              <span>BullMQ Queues</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Rate Limited</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Idempotent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 z-10">
        ReachInbox / Outbox Labs Hiring Assignment • Production Email Engine
      </div>
    </div>
  );
}
