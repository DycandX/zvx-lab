# 📊 Web Personal Status Board & Uptime Monitor

A beautiful, lightweight, and zero-cost DevOps-style dashboard to monitor availability and response times for personal microservices and web projects in real-time.

## 🚀 Vision & Key Features

- **Global Status Banner**: Dynamic color-coded indicator reflecting the state of all services at a glance.
- **Interactive Uptime History (30 Days)**: Micro-bar visualization of daily logs (operational, partial outage, down) with zero-JS tooltips showing detailed latency and uptime ratios on hover.
- **Secure Serverless Architecture**: Proxy route handler shielding the third-party API token from the browser environment.
- **Fail-Safe Offline Cache**: Automatic `localStorage` backup that renders previously cached data with warnings if the third-party API is unreachable or rate-limited.
- **Mobile-Responsive DevOps Layout**: Modern dark mode UI leveraging custom Tailwind grids for seamless display across devices.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Data Source**: UptimeRobot API (v2/v3 compatible)
- **Environment**: Node.js & TypeScript

## ⚙️ Setup & Installation

### 1. Prerequisites
Create an account on [UptimeRobot](https://uptimerobot.com) and configure monitors for all target URLs listed in `src/config/projects.json`.

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
UPTIME_PROVIDER_API_KEY=your_uptimerobot_api_key_here
```

> [!IMPORTANT]
> The API key must remain strictly private and should never be committed to public repositories. `.env.local` is listed under `.gitignore` for this reason.

### 3. Local Development
Install dependencies and run the Next.js development server:
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the status board.

### 4. Customizing Mapped Projects
You can manage the listed projects by modifying [src/config/projects.json](src/config/projects.json):
```json
[
  {
    "id": "portfolio",
    "name": "Personal Portfolio",
    "description": "Main personal portfolio website and digital cv.",
    "url": "https://zulvikar.is-a.dev"
  }
]
```

## 📁 Directory Structure

```
zvx-lab/
├── src/
│   ├── app/
│   │   ├── api/uptime/route.ts   # Secure Serverless API Route Bridge
│   │   ├── globals.css           # Tailwind base styles
│   │   ├── layout.tsx            # App Router metadata & fonts
│   │   └── page.tsx              # Dashboard UI & cache controller
│   ├── config/
│   │   └── projects.json         # Static mapping of monitored sites
│   └── types/
│       └── uptime.ts             # Strong type contracts for telemetry data
```
