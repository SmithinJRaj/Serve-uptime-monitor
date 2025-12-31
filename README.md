# 🛰️ Sentinel — High-Fidelity Uptime Monitoring Service

Sentinel is a backend uptime monitoring service built with TypeScript and Node.js. It continuously checks the availability of registered web services, verifies failures using a multi-step validation process, and delivers actionable alerts through Discord and Email.

The system is designed to minimize false positives, preserve full historical data, and generate meaningful reliability metrics.

# ✨ Core Capabilities
1. Reliable Failure Detection

Sentinel uses a Three-Strike validation algorithm to confirm downtime before alerting.

Prevents transient network issues from triggering alerts

Introduces a Pending verification state before declaring downtime

Ensures alerts represent confirmed incidents, not noise

2. Multi-Channel Alerting

Alerts are routed based on urgency:

Discord Webhooks
Used for real-time incident notifications (ChatOps style)

Email (SMTP)
Used for recovery reports and formal incident summaries

This separation ensures fast response without sacrificing auditability.

3. Downtime Analytics

Sentinel records every heartbeat check and computes:

Uptime Percentage

Average Response Latency

Incident Count

MTTR (Mean Time to Recovery)

Metrics are derived from persisted check data, not inferred guesses.

4. Automated Reporting

Scheduled cron jobs generate periodic performance summaries (e.g. weekly reports) that provide a high-level view of service reliability.

5. Persistent Storage

All checks, incidents, and recovery events are stored in PostgreSQL using Prisma ORM, enabling historical analysis and future extensibility.


# ⚙️ Three-Strike Validation Algorithm

Sentinel confirms downtime using the following flow:

1. Detection

A scheduled HTTP GET request fails (timeout, network error, or non-2xx response).

2. Validation (Pending State)

The service enters a Pending state.

Sentinel retries the check 3 times, with a 5-second delay between attempts.

3. Confirmation

If all retries fail:

The service is marked DOWN

A downtime incident is recorded

Alerts are dispatched

4. Recovery

When the service responds successfully again:

The incident is closed

Total downtime is calculated

A recovery notification is sent via email

This approach significantly reduces false positives caused by brief connectivity issues.

# 📊 Metrics Definition

Sentinel calculates metrics using explicit rules:

Uptime Percentage

(Successful Checks / Total Checks) × 100


Average Latency
Mean response time across all successful checks

MTTR (Mean Time to Recovery)
Average duration between confirmed downtime and recovery events

Metrics are derived from persisted heartbeat and incident data.

# 🛠️ Tech Stack

Runtime: Node.js

Language: TypeScript

Database: PostgreSQL

ORM: Prisma

Scheduling: node-cron

HTTP Client: Axios

Alerting: Discord Webhooks, Nodemailer (SMTP)

# 🚀 Installation & Setup
1. Clone the Repository
git clone https://github.com/yourusername/sentinel.git
cd sentinel

2. Install Dependencies
npm install

3. Configure Environment Variables

Create a .env file:

DATABASE_URL="postgresql://user:password@localhost:5432/sentinel"

DISCORD_WEBHOOK_URL="your_discord_webhook_url"

EMAIL_HOST="smtp.gmail.com"

EMAIL_PORT=587

EMAIL_USER="your-email@gmail.com"

EMAIL_PASS="your-app-password"

4. Run Database Migrations
npx prisma migrate dev

5. Start the Monitor
npm run start

# ⚠️ Known Limitations

Sentinel is currently designed as a single-node monitoring service:

All checks originate from one region

Cron-based scheduling depends on process uptime

Failure classification (DNS vs TLS vs HTTP) is basic

These trade-offs are intentional for v1 simplicity and clarity.

# 🔮 Planned Improvements

Failure-type classification (Network, DNS, TLS, HTTP)

Recovery stability window to prevent alert flapping

Alert cooldown and deduplication

Monitor self-health endpoint

Multi-region probing

Configurable retention policies

# 📜 License

MIT