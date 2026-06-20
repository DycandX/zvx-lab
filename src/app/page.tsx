'use client';

import { useState, useEffect } from 'react';
import { UptimeReportResponse, NormalizedProjectStatus } from '../types/uptime';

const CACHE_KEY = 'zvx-uptime-cache';

export default function Dashboard() {
  const [data, setData] = useState<UptimeReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Never');

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/uptime', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const report: UptimeReportResponse = await res.json();
      setData(report);
      setIsCached(false);
      localStorage.setItem(CACHE_KEY, JSON.stringify(report));
      updateLastUpdatedText(report.lastUpdated);
    } catch (err: any) {
      console.error('Error fetching uptime metrics:', err);
      
      // Attempt to load from localStorage cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsedCache: UptimeReportResponse = JSON.parse(cached);
          setData(parsedCache);
          setIsCached(true);
          setError('Unable to synchronize real-time metrics. Displaying cached data.');
          updateLastUpdatedText(parsedCache.lastUpdated);
        } catch (e) {
          setError('Unable to synchronize real-time metrics. Please try again later.');
        }
      } else {
        setError('Unable to synchronize real-time metrics. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLastUpdatedText = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = new Date().getTime() - date.getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      
      if (diffMins === 0) {
        setLastUpdatedText('Just now');
      } else if (diffMins === 1) {
        setLastUpdatedText('1 minute ago');
      } else {
        setLastUpdatedText(`${diffMins} minutes ago`);
      }
    } catch {
      setLastUpdatedText('Unknown');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Refresh every 5 minutes (300000 ms)
    const interval = setInterval(() => {
      fetchData(true);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Update elapsed time display helper every minute
  useEffect(() => {
    if (!data?.lastUpdated) return;
    const interval = setInterval(() => {
      updateLastUpdatedText(data.lastUpdated);
    }, 60000);
    return () => clearInterval(interval);
  }, [data]);

  const getBarColor = (status: 'operational' | 'partial' | 'down') => {
    switch (status) {
      case 'operational':
        return 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
      case 'partial':
        return 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
      case 'down':
        return 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
    }
  };

  const getStatusColorText = (status: 'operational' | 'partial' | 'down') => {
    switch (status) {
      case 'operational':
        return 'text-emerald-400';
      case 'partial':
        return 'text-amber-400';
      case 'down':
        return 'text-rose-400';
    }
  };

  const allOperational = data ? data.isAllOperational : false;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-slate-100 font-sans antialiasedSelection">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-slate-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">DevOps Guard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              System Status Board
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Real-time availability and response monitors for personal workspace nodes.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Last checked: {lastUpdatedText}
            </span>
            <button
              onClick={() => fetchData(false)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 hover:border-slate-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* Global Error/Warning Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-start gap-3 shadow-lg shadow-rose-950/10">
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="text-sm">
              <span className="font-semibold text-rose-200">System Alert:</span>{' '}
              <span className="text-rose-300/90">{error}</span>
            </div>
          </div>
        )}

        {/* Global Status Banner */}
        {loading && !data ? (
          <div className="h-16 w-full bg-slate-900/40 border border-slate-800/80 rounded-xl mb-8 animate-pulse" />
        ) : data ? (
          <div className={`mb-8 p-5 rounded-xl border flex items-center justify-between shadow-xl transition-all duration-500 backdrop-blur-md ${
            allOperational 
              ? 'bg-emerald-950/20 border-emerald-500/20 shadow-emerald-950/5' 
              : 'bg-amber-950/20 border-amber-500/20 shadow-amber-950/5'
          }`}>
            <div className="flex items-center gap-4">
              <span className="relative flex h-4 w-4">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${allOperational ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 ${allOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <div>
                <h2 className="text-md font-bold tracking-tight text-white">
                  {allOperational ? 'All Systems Operational' : 'Some Nodes Experiencing Issues'}
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {allOperational 
                    ? 'All mapped microservices and sites are responsive and behaving normally.' 
                    : 'System detected service degradation or offline nodes. Checking actively.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading && !data ? (
            Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)
          ) : data ? (
            data.projects.map((project) => (
              <ServiceCard 
                key={project.id} 
                project={project} 
                getBarColor={getBarColor} 
                getStatusColorText={getStatusColorText} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16 border border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-500 text-sm">No systems configurations found or failed loading metadata.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-slate-500 border-t border-slate-900 pt-8">
          <p>© {new Date().getFullYear()} zvx-lab. Secured serverless telemetry integration.</p>
        </footer>

      </div>
    </main>
  );
}

interface ServiceCardProps {
  project: NormalizedProjectStatus;
  getBarColor: (status: 'operational' | 'partial' | 'down') => string;
  getStatusColorText: (status: 'operational' | 'partial' | 'down') => string;
}

function ServiceCard({ project, getBarColor, getStatusColorText }: ServiceCardProps) {
  const isUp = project.status === 'operational';

  return (
    <div className="bg-slate-950/40 backdrop-blur-md border border-slate-900 rounded-xl p-6 shadow-xl hover:border-slate-800 transition-all duration-300 group flex flex-col justify-between">
      <div>
        {/* Card Top Row */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-white transition-colors">
              {project.name}
            </h3>
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-slate-400 hover:text-slate-300 inline-flex items-center gap-1 mt-1 transition-colors hover:underline"
            >
              {project.url.replace(/^https?:\/\//, '')}
              <svg className="w-3 h-3 text-slate-500 group-hover:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isUp 
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {isUp ? 'Operational' : 'Offline'}
          </span>
        </div>

        {/* Project Description */}
        <p className="text-slate-400 text-sm line-clamp-2 min-h-[40px] mb-6">
          {project.description}
        </p>
      </div>

      <div>
        {/* Spark/Uptime 30 Bars */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Uptime (30 days)</span>
            <span className="font-semibold">{project.uptimePercentage.toFixed(2)}%</span>
          </div>

          <div className="flex gap-1 items-center justify-between">
            {project.history.map((day, idx) => (
              <div key={idx} className="relative group flex-1 py-1 cursor-pointer">
                <div className={`h-6 rounded-sm w-full transition-all duration-200 hover:scale-y-125 ${getBarColor(day.status)}`} />
                
                {/* Floating Interactive Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 w-44 p-2 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded-lg shadow-2xl pointer-events-none transition-all duration-200">
                  <div className="font-bold text-white border-b border-slate-800 pb-1 mb-1.5 w-full text-center">
                    {day.date}
                  </div>
                  <div className="flex justify-between w-full mb-0.5">
                    <span>Status:</span>
                    <span className={`font-semibold capitalize ${getStatusColorText(day.status)}`}>{day.status}</span>
                  </div>
                  <div className="flex justify-between w-full mb-0.5">
                    <span>Uptime:</span>
                    <span className="font-semibold text-slate-100">{day.uptimePercentage}%</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span>Latency:</span>
                    <span className="font-semibold text-slate-100">{day.responseTime !== null ? `${day.responseTime} ms` : '—'}</span>
                  </div>
                  {/* Tooltip triangle tail */}
                  <div className="w-1.5 h-1.5 rotate-45 bg-slate-900 border-r border-b border-slate-800 absolute top-full -mt-[4px]" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Latency & Metrics Footer */}
        <div className="flex justify-between items-center text-xs border-t border-slate-900/60 pt-4">
          <div className="flex items-center gap-1 text-slate-400">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Response Time</span>
          </div>
          <span className="font-bold text-slate-200">
            {project.responseTime !== null ? `${project.responseTime}ms` : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-6 shadow-xl animate-pulse flex flex-col justify-between h-[256px]">
      <div>
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="space-y-2">
            <div className="h-5 bg-slate-800 rounded w-28"></div>
            <div className="h-3 bg-slate-800 rounded w-36"></div>
          </div>
          <div className="h-5 bg-slate-800 rounded-full w-20"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3.5 bg-slate-800 rounded w-full"></div>
          <div className="h-3.5 bg-slate-800 rounded w-4/5"></div>
        </div>
      </div>
      <div>
        <div className="h-8 bg-slate-800 rounded mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-slate-800 rounded w-16"></div>
          <div className="h-3 bg-slate-800 rounded w-12"></div>
        </div>
      </div>
    </div>
  );
}
