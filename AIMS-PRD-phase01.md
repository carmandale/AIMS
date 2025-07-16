Product Requirements Document (PRD): Automated Investment Management System (AIMS)

1. Document Information
	•	Title: Automated Investment Management System (AIMS)
	•	Version: 1.2 (Draft – updated July 12 2025)
	•	Date: July 12 2025
	•	Author: Grok (AI Assistant, in collaboration with Dale)
	•	Status: Draft
	•	Change Log:
	•	v1.2 (2025-07-12) – Added daily dashboard features, aggressive return targets with risk safeguards, weekly workflow refinements, and technical additions for 1-2% weekly goals.
	•	v1.1 (2025-07-11) – Added Phase 1 Web Dashboard, TODO Workflow, and Trade-Ticket Builder requirements.
	•	v1.0 (2025-07-11) – Initial PRD baseline.
	•	Purpose: Define the requirements for an automated system that monitors a $600 k portfolio (Fidelity, Robinhood, Coinbase), generates income (initially $10 k/mo, scaling to $40 k/mo), and provides a web-based workflow for disciplined weekly execution.

⸻

2. Executive Summary

AIMS is a modular Python-backed platform with a lightweight web dashboard. Phase 1 (this PRD’s immediate scope) focuses on visibility and disciplined execution:
	1.	Run Weekly Reports that pull account data and market analytics.
	2.	Produce a Ready-to-Send Trade Ticket for manual execution at the broker of choice.
	3.	Enforce Weekly Discipline via a built-in TODO list—tasks must be checked off before the next cycle can close.

Later phases will layer on optional automation, advanced ML, and expanded broker support. Success is measured by achieving $10 k/month net income within three months while limiting drawdowns < 20 %.

⸻

3. Problem Statement & Objectives

3.1 Problem

Manually juggling three brokerages is error-prone and time-consuming. There is no single source of truth or workflow guard-rail to ensure the user completes the same critical tasks every week (e.g., review signals, create ticket, verify execution).

3.2 Objectives

#	Objective	KPI / Target
P1-O1	Consolidate data into a single dashboard	100 % account coverage daily
P1-O2	Generate a trade ticket PDF/JSON each Friday by 3 PM CT	Ticket produced ≥ 95 % of weeks
P1-O3	Checklist compliance – tasks must be checked off before the next cycle	≥ 90 % tasks completed on-time
P1-O4	Achieve ≥ $10 k net income per month by Month 3	Financial metric hit
P1-O5	Achieve 1-2% weekly net returns, measured post-fees	Weekly returns tracked and met ≥ 80% of weeks, with drawdowns <15%


⸻

4. Stakeholders (unchanged)
	•	Primary User: Dale (Investor)
	•	Engineering: Internal or contract Python / Front-end devs
	•	Compliance Advisors: External CPA / legal as needed

⸻

5. Assumptions, Constraints & Dependencies (add-ons)
	•	Front-end will be a minimal React + Tailwind bundle served by FastAPI.
	•	Authentication: Local password for Phase 1; OAuth-based SSO considered Phase 2.
	•	Task Persistence: Lightweight SQLite for Phase 1; upgradeable to Postgres.

⸻

6. Scope

6.1 In Scope – Phase 1
	1.	Web dashboard with summary cards and checklist widget
	2.	Weekly report generator & trade-ticket builder (manual execution)
	3.	CRUD screens for task templates and schedule
	4.	Audit log of ticket creation and task completion

6.2 Out of Scope – Phase 1
	•	Auto-execution of trades (deferred to Phase 2)
	•	Mobile-first UI (desktop-web responsive only)

⸻

7. Functional Requirements

7.1 Core Features (Phase 1)

ID	Feature	Description	Acceptance Criteria
FR-1	Account Data Fetcher	Pull balances/positions daily via SnapTrade, ccxt, yfinance	Fetcher returns JSON ≤ 60 s with ≤ 0.5 % error rate.
FR-2	Analysis Engine	Compute TA indicators + risk metrics, including high-yield strategy backtests (e.g., options wheels)	Indicators calculated for 100 assets in <3 min; flags 1-2% weekly opportunities.
FR-3	Report Generator	Compile “Weekly Performance” PDF + JSON	Triggers every Fri @ 15:00 CT; file stored & downloadable.
FR-4	Trade-Ticket Builder	Pre-fill symbol, expiry, strike, qty with risk limits (e.g., <5% allocation)	User can edit fields, click Mark Executed, and entry is timestamped.
FR-5	TODO / Task Engine	Checklist with recurring tasks (cron-style RRULE), including daily prep tasks	Tasks must be checked before FR-3 can close next week; overdue tasks flagged red.
FR-6	Web Dashboard UI	React widgets: Portfolio Value, Income YTD, “Next Actions”, Morning Brief (overnight P/L, alerts)	Loads in <2 s, PWA score ≥ 80.
FR-7	Performance Tracker	Log actual vs. targeted 1-2% weekly returns with visualizations	Cumulative income chart updated weekly.

7.2 User Stories (additions)
	•	US-01: As Dale, I see a Next Actions list; I must check each task (e.g., “Review Ticket”, “Update Watch-list”) before the system marks the week complete.
	•	US-02: As Dale, I download a PDF trade ticket, sign into Fidelity, paste the order, then return and click Executed so the dashboard turns green.
	•	US-03: As Dale, I receive a daily "Morning Brief" summary with key metrics and alerts, so I can quickly check status each morning.
	•	US-04: As Dale, I see flagged high-yield trade opportunities (aiming 1-2% weekly) with built-in risk checks before generating the ticket.

⸻

8. Non-Functional Requirements (additions)
	•	Security: Signed JWT session cookie; CORS locked to localhost by default.
	•	Accessibility: WCAG 2.1 AA for dashboard components.
	•	Alerting: Daily email/push notifications for critical events (e.g., volatility >2%).

⸻

9. Technical Specifications (additions)

Layer	Tech	Purpose
Front-end	React 18 + Tailwind	SPA dashboard
Back-end	FastAPI	REST & auth
Jobs	APScheduler	Weekly cron jobs + daily alerts
DB	SQLite (Phase 1)	Checklist & audit
Reports	WeasyPrint	HTML-to-PDF
Alerting	Twilio or SMTP	Notifications


⸻

10. Design & UX
	•	Wireframe
	1.	Header: Portfolio Value, Cash Buffer
	2.	Grid:
	•	Card 1 – “Weekly P/L” sparkline
	•	Card 2 – “Income vs Goal” progress bar (including 1-2% weekly target)
	•	Card 3 – Next Actions list (checkboxes, with daily tasks)
	•	Card 4 – Link to latest PDF ticket
	•	Card 5 – Morning Brief: Overnight changes, alerts
	•	Color Coding: Green = done, Yellow = due, Red = overdue

⸻

11. Timeline & Release Plan (re-framed)

Phase	Duration	Deliverables
P0 – Setup	Week 1	Repo, CI/CD, FastAPI skeleton
P1 – Data + UI	Weeks 2-3	Fetcher, dashboard skeleton with Morning Brief
P2 – Reports + Tickets	Weeks 4-5	FR-3 & FR-4; first live PDF with risk limits
P3 – TODO Engine	Week 6	FR-5 integrated; FR-7 tracker; end-to-end demo
Beta Hardening	Weeks 7-8	Bug fixes, polish, docs
Launch	Week 9	Go-live; begin production data


⸻

12. Risks & Mitigations (no change from v1.0 beyond UI security now covered)

⸻

13. Appendices
	•	A. Sample Weekly Task Template

Task	RRULE	Blocking?
Morning Review: Check signals	RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8	❌
Review portfolio drift	RRULE:FREQ=WEEKLY;BYDAY=FR;BYHOUR=14	✅
Approve trade ticket	RRULE:FREQ=WEEKLY;BYDAY=FR;BYHOUR=15	✅
Log execution in dashboard	RRULE:FREQ=WEEKLY;BYDAY=FR;BYHOUR=15;BYMINUTE=30	✅


	•	B. Example Trade Ticket JSON

{
  "ticket_id": "2025-W28-BTC-PUT",
  "symbol": "BTCUSD",
  "strategy": "Cash-Secured Put",
  "expiry": "2025-08-29",
  "strike": 100000,
  "quantity": 1,
  "premium": 3500,
  "status": "PENDING"
}



End of Document – v1.2


### Review of Claude's Plan

I've reviewed the plan Claude proposed for P0 (project setup). It's well-structured, aligns closely with the PRD's tech specs (Section 9) and timeline (Section 11), and sets a solid, extensible foundation. Strengths include:
- Clear modular structure (e.g., `src/api`, `tests`) that's easy to build on for later phases.
- Appropriate dependencies: Core ones match the PRD (FastAPI, APScheduler, SQLite), with smart additions like pydantic and dotenv for config/validation.
- Dev tools and CI/CD via GitHub Actions cover linting, testing, etc., ensuring quality from the start.
- FastAPI skeleton addresses security (CORS) and basics like a health endpoint.

No major issues—it's not "terminal lines" (perhaps you meant the plan output?), but a clean proposal. I approve it with these minor revisions to make it even tighter:
- Add WeasyPrint to `requirements.txt` (per PRD reports layer), even if not implemented in P0.
- In `README.md`, include a brief overview from the PRD's Executive Summary (Section 2) and setup instructions (e.g., `pip install -r requirements.txt; uvicorn src.api.main:app --reload`).
- Explicitly initialize the Git repo in the workspace root (`AIMS/`), and make the initial commit message: "Initial project setup for AIMS Phase 1".

Once you confirm, we can prompt Claude to implement this approved plan. Ready?