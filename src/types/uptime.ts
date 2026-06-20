/**
 * Represents a monitored project as defined in local configuration (projects.json).
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
}

/**
 * Normalized status of a monitored project, returned to the frontend.
 */
export type MonitorStatus = 'operational' | 'partial' | 'down';

export interface DailyUptimeHistory {
  date: string; // ISO Format YYYY-MM-DD
  status: MonitorStatus;
  uptimePercentage: number;
  responseTime: number | null; // Response time in milliseconds
}

export interface NormalizedProjectStatus {
  id: string;
  name: string;
  description: string;
  url: string;
  status: 'operational' | 'down';
  uptimePercentage: number; // Overall uptime percentage (e.g., 99.95)
  responseTime: number | null; // Current response time in ms
  history: DailyUptimeHistory[]; // 30 days history
}

export interface UptimeReportResponse {
  isAllOperational: boolean;
  lastUpdated: string; // ISO string
  projects: NormalizedProjectStatus[];
}

/**
 * UptimeRobot v2/v3 API Interface Definitions
 */
export interface UptimeRobotLog {
  type: number; // 1 = Up, 2 = Down, 99 = Paused, etc.
  datetime: number; // Unix timestamp
  duration: number; // in seconds
  reason?: {
    code: string;
    detail: string;
  };
}

export interface UptimeRobotResponseTime {
  datetime: number; // Unix timestamp
  value: number; // in milliseconds
}

export interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  status: number; // 0 = paused, 1 = not checked yet, 2 = up, 8 = seems down, 9 = down
  all_time_uptime_ratio?: string;
  custom_uptime_ratios?: string;
  logs?: UptimeRobotLog[];
  response_times?: UptimeRobotResponseTime[];
}

export interface UptimeRobotResponse {
  stat: 'ok' | 'fail';
  pagination?: {
    offset: number;
    limit: number;
    total: number;
  };
  monitors?: UptimeRobotMonitor[];
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Better Stack Uptime API Interface Definitions (JSON:API v2 format)
 */
export interface BetterStackMonitorAttributes {
  url: string;
  pronounceable_name: string;
  monitor_type: 'status' | 'keyword' | 'ping' | 'tcp' | 'udp' | 'smtp' | 'pop' | 'imap' | 'dns';
  status: 'up' | 'down' | 'paused' | 'validating';
  last_checked_at: string; // ISO Timestamp
  created_at: string; // ISO Timestamp
  updated_at: string; // ISO Timestamp
  team_name?: string;
  // Dynamic average metrics (usually retrieved or mapped)
  uptime_ratio?: number;
  response_time?: number;
}

export interface BetterStackMonitor {
  id: string;
  type: 'monitor';
  attributes: BetterStackMonitorAttributes;
}

export interface BetterStackResponse {
  data: BetterStackMonitor | BetterStackMonitor[];
  included?: any[];
  pagination?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}
