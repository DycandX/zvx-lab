import { NextResponse } from 'next/server';
import projectsData from '../../../config/projects.json';
import { Project, NormalizedProjectStatus, DailyUptimeHistory } from '../../../types/uptime';

export const dynamic = 'force-dynamic';

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').toLowerCase();
  }
}

function generate30DaysHistory(
  monitorStatus: number,
  logs: any[] = [],
  responseTimes: any[] = []
): DailyUptimeHistory[] {
  const history: DailyUptimeHistory[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Find timestamp boundaries in Unix epoch (seconds)
    const dayStart = new Date(dateStr + 'T00:00:00Z').getTime() / 1000;
    const dayEnd = new Date(dateStr + 'T23:59:59Z').getTime() / 1000;

    const dayLogs = logs.filter(log => log.datetime >= dayStart && log.datetime <= dayEnd);
    const dayResponseTimes = responseTimes.filter(
      rt => rt.datetime >= dayStart && rt.datetime <= dayEnd
    );

    // Determine status of the day
    let status: 'operational' | 'partial' | 'down' = 'operational';
    
    if (dayLogs.length > 0) {
      const hasDown = dayLogs.some(log => log.type === 2); // 2 is down
      const hasUp = dayLogs.some(log => log.type === 1); // 1 is up
      
      if (hasDown && hasUp) {
        status = 'partial';
      } else if (hasDown) {
        status = 'down';
      }
    } else {
      // Inherit from closest log prior to this day
      const priorLogs = logs.filter(log => log.datetime < dayStart);
      if (priorLogs.length > 0) {
        priorLogs.sort((a, b) => b.datetime - a.datetime);
        const latestPrior = priorLogs[0];
        status = latestPrior.type === 2 ? 'down' : 'operational';
      } else {
        // Fallback to current monitor status if no logs are present
        status = monitorStatus === 9 || monitorStatus === 8 ? 'down' : 'operational';
      }
    }

    // Determine average response time
    let avgResponseTime: number | null = null;
    if (dayResponseTimes.length > 0) {
      const sum = dayResponseTimes.reduce((acc, rt) => acc + rt.value, 0);
      avgResponseTime = Math.round(sum / dayResponseTimes.length);
    }

    // Daily uptime ratio estimation
    let dailyUptime = 100;
    if (status === 'down') {
      dailyUptime = 0;
    } else if (status === 'partial') {
      const totalDownSecs = dayLogs
        .filter(log => log.type === 2)
        .reduce((sum, log) => sum + (log.duration || 0), 0);
      const daySecs = 86400;
      dailyUptime = Math.max(0, Math.min(100, Math.round(((daySecs - totalDownSecs) / daySecs) * 10000) / 100));
    }

    history.push({
      date: dateStr,
      status,
      uptimePercentage: dailyUptime,
      responseTime: avgResponseTime
    });
  }

  return history;
}

export async function GET() {
  try {
    const apiKey = process.env.UPTIME_PROVIDER_API_KEY;

    if (!apiKey) {
      console.error('Missing UPTIME_PROVIDER_API_KEY environment variable.');
      return NextResponse.json(
        { error: 'API key configuration missing on server.' },
        { status: 500 }
      );
    }

    // Call UptimeRobot API
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        format: 'json',
        logs: 1,
        response_times: 1,
        custom_uptime_ratios: '30',
      }),
    });

    if (!response.ok) {
      throw new Error(`UptimeRobot responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.stat === 'fail') {
      console.error('UptimeRobot API failed:', data.error);
      return NextResponse.json(
        { error: data.error?.message || 'UptimeRobot authentication or request error.' },
        { status: 500 }
      );
    }

    const monitors = data.monitors || [];

    // Map database config projects to UptimeRobot monitor results
    const mappedProjects: NormalizedProjectStatus[] = (projectsData as Project[]).map((project) => {
      const monitor = monitors.find((m: any) => normalizeUrl(m.url) === normalizeUrl(project.url));

      if (!monitor) {
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          url: project.url,
          status: 'down',
          uptimePercentage: 0,
          responseTime: null,
          history: generate30DaysHistory(9, [], []),
        };
      }

      const uptimePercentage = monitor.custom_uptime_ratios
        ? parseFloat(monitor.custom_uptime_ratios.split('-')[0])
        : 100;

      let currentResponseTime: number | null = null;
      if (monitor.response_times && monitor.response_times.length > 0) {
        currentResponseTime = monitor.response_times[monitor.response_times.length - 1].value;
      }

      const history = generate30DaysHistory(
        monitor.status,
        monitor.logs || [],
        monitor.response_times || []
      );

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        url: project.url,
        status: monitor.status === 9 || monitor.status === 8 ? 'down' : 'operational',
        uptimePercentage,
        responseTime: currentResponseTime,
        history,
      };
    });

    const isAllOperational = mappedProjects.every(p => p.status === 'operational');

    return NextResponse.json({
      isAllOperational,
      lastUpdated: new Date().toISOString(),
      projects: mappedProjects,
    });

  } catch (error: any) {
    console.error('Uptime API Route Handler error:', error);
    return NextResponse.json(
      { error: 'Unable to synchronize real-time metrics.' },
      { status: 500 }
    );
  }
}
