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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'operational' | 'down'>('all');

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
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

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
        return 'bg-emerald-500 hover:bg-emerald-400 hover:scale-y-125 hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'partial':
        return 'bg-amber-500 hover:bg-amber-400 hover:scale-y-125 hover:shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      case 'down':
        return 'bg-rose-500 hover:bg-rose-400 hover:scale-y-125 hover:shadow-[0_0_10px_rgba(244,63,94,0.5)]';
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

  // Calculate statistics
  const totalProjects = data?.projects.length || 0;
  const avgUptime = data && totalProjects > 0
    ? data.projects.reduce((acc, p) => acc + p.uptimePercentage, 0) / totalProjects
    : 100;

  const activeLatencies = data
    ? data.projects.filter(p => p.responseTime !== null).map(p => p.responseTime as number)
    : [];
  const avgLatency = activeLatencies.length > 0
    ? Math.round(activeLatencies.reduce((acc, val) => acc + val, 0) / activeLatencies.length)
    : null;

  // Filter projects list
  const filteredProjects = data
    ? data.projects.filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              project.url.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <main 
      className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative pb-16"
      style={{ 
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.02) 1px, transparent 0)', 
        backgroundSize: '24px 24px' 
      }}
    >
      {/* Dynamic glow backdrops */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 pt-12 md:pt-20 relative z-10">
        
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 pb-6 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Secure Live Stream</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1.5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Node Guard Status Board
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Enterprise-grade real-time status & latency index for microservices.
            </p>
          </div>
          
          <div className="flex items-center gap-4 self-start sm:self-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Interval: 5m
            </span>
            <button
              onClick={() => fetchData(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 text-xs font-bold rounded-lg border border-slate-900 hover:border-slate-800 active:scale-95 transition-all disabled:opacity-50 shadow-md backdrop-blur-sm cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Sync Dashboard
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-rose-950/20 border border-rose-800/20 rounded-xl flex items-center gap-3.5 shadow-lg shadow-rose-950/5 backdrop-blur-md">
            <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="text-xs font-semibold text-rose-300">
              {error}
            </div>
          </div>
        )}

        {/* Bento Stats Grid */}
        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 bg-slate-900/30 border border-slate-900/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Stat 1: Global Status */}
            <div className={`p-6 rounded-xl border backdrop-blur-md transition-all duration-500 flex flex-col justify-between ${
              allOperational 
                ? 'bg-emerald-950/10 border-emerald-500/10 shadow-md shadow-emerald-950/5' 
                : 'bg-amber-950/10 border-amber-500/10 shadow-md shadow-amber-950/5'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${allOperational ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${allOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-none">
                  {allOperational ? 'All Nodes Active' : 'Performance Issue'}
                </h2>
                <p className="text-slate-400 text-[11px] mt-1.5 font-medium leading-relaxed">
                  {allOperational 
                    ? 'All microservices are responding normally.' 
                    : 'System detected offline / latency timeouts.'}
                </p>
              </div>
            </div>

            {/* Stat 2: Average Uptime */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-950/40 backdrop-blur-md shadow-md flex flex-col justify-between hover:border-slate-800 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Uptime</span>
                <svg className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white leading-none">
                  {avgUptime.toFixed(3)}%
                </h2>
                <p className="text-slate-400 text-[11px] mt-1.5 font-medium leading-relaxed">
                  Aggregate availability across 30 days.
                </p>
              </div>
            </div>

            {/* Stat 3: Average Latency */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-950/40 backdrop-blur-md shadow-md flex flex-col justify-between hover:border-slate-800 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mean Latency</span>
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white leading-none">
                  {avgLatency !== null ? `${avgLatency} ms` : 'Offline'}
                </h2>
                <p className="text-slate-400 text-[11px] mt-1.5 font-medium leading-relaxed">
                  Average ping response interval today.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Filter & Search Bar */}
        {data && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-800 transition-colors shadow-inner"
              />
            </div>

            <div className="flex p-1 bg-slate-950/60 border border-slate-900 rounded-xl self-stretch sm:self-auto justify-center">
              {(['all', 'operational', 'down'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter === 'down' ? 'Offline' : filter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mapped Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading && !data ? (
            Array.from({ length: 2 }).map((_, idx) => <SkeletonCard key={idx} />)
          ) : data && filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <ServiceCard 
                key={project.id} 
                project={project} 
                getBarColor={getBarColor} 
                getStatusColorText={getStatusColorText} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
              <svg className="w-8 h-8 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500 text-xs font-semibold">
                No active nodes match current filters.
              </p>
            </div>
          )}
        </div>

        {/* Page Footer */}
        <footer className="mt-20 text-center text-[10px] text-slate-600 border-t border-slate-900/60 pt-8 font-semibold tracking-wider uppercase">
          <p>© {new Date().getFullYear()} zvx-lab. Live serverless node guard. All rights reserved.</p>
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
    <div className="bg-slate-950/30 backdrop-blur-md border border-slate-900 rounded-2xl p-6 shadow-xl hover:border-slate-800 hover:-translate-y-1 hover:shadow-emerald-950/5 transition-all duration-300 group flex flex-col justify-between">
      <div>
        {/* Card Header Row */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 group-hover:text-white transition-colors">
              {project.name}
            </h3>
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] text-slate-500 hover:text-slate-400 inline-flex items-center gap-1 mt-1 transition-colors hover:underline"
            >
              {project.url.replace(/^https?:\/\//, '')}
              <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isUp 
              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-950/20' 
              : 'bg-rose-950/30 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-950/20'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {isUp ? 'Operational' : 'Offline'}
          </span>
        </div>

        {/* Project Description */}
        <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-2 min-h-[36px] mb-6">
          {project.description}
        </p>
      </div>

      <div>
        {/* Spark/Uptime 30 Bars */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">
            <span>Uptime (30d)</span>
            <span className="font-extrabold text-slate-300">{project.uptimePercentage.toFixed(2)}%</span>
          </div>

          <div className="flex gap-1 items-center justify-between">
            {project.history.map((day, idx) => (
              <div key={idx} className="relative group flex-1 py-1 cursor-pointer">
                {/* Individual spark bar */}
                <div className={`h-7 rounded-[3px] w-full transition-all duration-200 ${getBarColor(day.status)}`} />
                
                {/* Floating Interactive Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:flex flex-col items-center z-30 w-44 p-3 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 rounded-xl shadow-2xl pointer-events-none transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2">
                  <div className="font-extrabold text-white border-b border-slate-800/80 pb-1.5 mb-2 w-full text-center tracking-wider">
                    {day.date}
                  </div>
                  <div className="flex justify-between w-full mb-1">
                    <span>Status:</span>
                    <span className={`font-extrabold capitalize ${getStatusColorText(day.status)}`}>{day.status}</span>
                  </div>
                  <div className="flex justify-between w-full mb-1">
                    <span>Uptime Ratio:</span>
                    <span className="font-extrabold text-slate-200">{day.uptimePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span>Ping Response:</span>
                    <span className="font-extrabold text-slate-200">{day.responseTime !== null ? `${day.responseTime} ms` : '—'}</span>
                  </div>
                  {/* Tooltip triangle tail */}
                  <div className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-800 absolute top-full -mt-[5px]" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Latency & Metrics Footer */}
        <div className="flex justify-between items-center text-[11px] border-t border-slate-900/60 pt-4">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider">
            <svg className="w-3.5 h-3.5 text-slate-650" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Response Time</span>
          </div>
          <span className="font-black text-slate-200">
            {project.responseTime !== null ? `${project.responseTime} ms` : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-950/20 border border-slate-900 rounded-2xl p-6 shadow-xl animate-pulse flex flex-col justify-between h-[256px]">
      <div>
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="space-y-2.5">
            <div className="h-5 bg-slate-800 rounded w-28"></div>
            <div className="h-3 bg-slate-800 rounded w-36"></div>
          </div>
          <div className="h-5.5 bg-slate-800 rounded-full w-20"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3.5 bg-slate-800 rounded w-full"></div>
          <div className="h-3.5 bg-slate-800 rounded w-4/5"></div>
        </div>
      </div>
      <div>
        <div className="h-7 bg-slate-800 rounded mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-slate-800 rounded w-16"></div>
          <div className="h-3 bg-slate-800 rounded w-12"></div>
        </div>
      </div>
    </div>
  );
}
