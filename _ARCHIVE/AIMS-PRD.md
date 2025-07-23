# Product Requirements Document (PRD): Automated Investment Management System (AIMS)

## 1. Document Information
- **Title:** Automated Investment Management System (AIMS)
- **Version:** 1.0
- **Date:** July 11, 2025
- **Author:** Grok (AI Assistant, based on user collaboration)
- **Status:** Draft
- **Purpose of Document:** This PRD outlines the requirements for developing an automated software system to manage a $600k investment portfolio across Fidelity, Robinhood, and Coinbase. The system aims to fetch account data, perform market analysis, execute trades/adjustments, and generate targeted monthly income (starting at $10k, scaling to $40k spendable while reinvesting for growth). This is grounded in the user's investment plan, treating it as a "product" for personal financial automation.

## 2. Executive Summary
The Automated Investment Management System (AIMS) is a Python-based software tool designed to automate the monitoring, analysis, and optimization of a diversified investment portfolio. Starting with $600k in liquid assets ($240k in stocks/options via Fidelity/Robinhood, $240k in crypto via Coinbase, $120k in cash buffer), AIMS will integrate with brokerage APIs (via third-party services like SnapTrade for compliance), analyze market trends/sentiment, suggest/execute trades, and track progress toward income goals.

Key objectives:
- Generate $10k/month initially through a mix of options income, crypto staking/trading, and stock dividends.
- Scale to $40k/month spendable income by Year 2, with excess reinvested for portfolio growth (projected to $663k-$1M+ in 5 years under optimistic scenarios).
- Ensure compliance, risk management, and user oversight to mitigate losses in volatile markets.

This system addresses the user's need for a hands-off yet customizable tool to leverage current bull markets (e.g., BTC at ~$118k, XRP at ~$2.50 as of July 2025). Development will prioritize security, modularity, and extensibility.

## 3. Problem Statement and Objectives
### 3.1 Problem Statement
Manual management of multiple brokerage accounts (Fidelity, Robinhood, Coinbase) is time-consuming and error-prone. Markets are volatile, requiring daily/weekly adjustments based on trends, sentiment, and portfolio performance. The user seeks to generate consistent income ($10k/month ramping to $40k) from $600k capital without depleting principal, but lacks an integrated tool for data aggregation, analysis, and automated trading.

### 3.2 Objectives
- **Primary:** Automate data fetching, analysis, and adjustments to achieve 1.67% monthly returns initially (scaling to 6-8% for higher goals), blending income (options premiums, staking) and growth (momentum trading).
- **Secondary:** Provide dashboards for monitoring, simulations for 5-year projections, and alerts for risks.
- **Business Alignment:** Align with personal finance goals; no commercial intent, but designed for scalability if expanded.
- **Success Metrics:**
  - Achieve $10k/month income within 3 months post-launch.
  - Scale to $40k/month by Month 18, with portfolio growth of at least 10% annually.
  - Limit drawdowns to <20% via risk controls.
  - User satisfaction: 100% compliance with manual override requirements.

## 4. Stakeholders
- **User/Owner:** The individual investor (primary user) – responsible for initial setup, approvals, and overrides.
- **Development Team:** Python developers (hypothetical or user themselves) – build and maintain the system.
- **External Dependencies:** Brokerages (Fidelity, Robinhood, Coinbase via APIs/SnapTrade); data providers (e.g., yfinance, ccxt).
- **Advisors:** Financial/tax professionals (consulted externally for compliance).
- **Regulators:** Ensure adherence to SEC/FINRA rules (e.g., no unauthorized trading bots).

## 5. Assumptions, Constraints, and Dependencies
### 5.1 Assumptions
- Markets remain bullish (e.g., BTC/XRP trends continue per 2025 data).
- User has API access/OAuth setup for accounts.
- Python environment with libraries (pandas, requests, ta, torch) is available; no internet for pip installs beyond initial.
- Returns are probabilistic; system assumes 1-5% monthly gross based on historical backtests.
- User complies with taxes (20-30% on gains) and legal requirements.

### 5.2 Constraints
- No direct logins (use OAuth/APIs to avoid TOS violations).
- Budget: Low-cost (e.g., $20-50/month for SnapTrade).
- Platform: Python 3.12+; run locally or on cloud (e.g., Colab).
- Risk: Max 5% capital per trade; no leverage >2x without approval.
- Scope Limits: Read-only initially; trading via user-confirmed APIs (Coinbase/Robinhood support it).

### 5.3 Dependencies
- Third-party APIs: SnapTrade for unified access; ccxt/yfinance for market data.
- Libraries: requests, pandas, ta (for indicators), torch (for ML predictions).
- External Tools: Web search for sentiment (integrated via manual or API calls).

## 6. Scope
### 6.1 In Scope
- Data aggregation from accounts.
- Market/trend/sentiment analysis.
- Trade suggestions/executions (with confirmation).
- Income tracking and projections (e.g., 5-year simulations).
- Risk management (e.g., stop-losses, VaR calculations).

### 6.2 Out of Scope
- Full automated trading without user input (to comply with TOS).
- Tax filing/optimization.
- Mobile app (desktop Python script only).
- Support for additional brokerages without updates.
- Guaranteed returns (system provides tools, not advice).

## 7. Functional Requirements
### 7.1 Core Features
1. **Account Data Fetching Module**
   - Integrate with SnapTrade/Coinbase/Robinhood APIs to fetch balances, holdings, transactions daily.
   - Output: Pandas DataFrame with portfolio summary (total value, allocation).

2. **Analysis Engine**
   - Market Trends: Use TA indicators (RSI, MAs) on fetched prices.
   - Sentiment: Query external sources (e.g., web_search for "BTC sentiment July 2025").
   - Portfolio Analysis: Calculate P&L, allocation drift, VaR.
   - Projections: Simulate 5-year scenarios (conservative/base/optimistic) using compounding formulas.

3. **Trading/Adjustment Module**
   - Generate signals (Buy/Sell/Hold) based on rules (e.g., RSI <30 = Buy).
   - Suggest rebalances (e.g., sell 5% BTC if overbought).
   - Execute via APIs (user-confirmed; e.g., place_order on Coinbase).

4. **Income Generation Module**
   - Track monthly yields (options premiums, staking).
   - Automate withdrawals/reinvestments (e.g., withdraw $10k if target met).
   - Dashboard: Visualize portfolio growth, income vs. goals.

5. **Reporting and Alerts**
   - Weekly reports (CSV/prints) on performance.
   - Alerts for risks (e.g., >10% drawdown).

### 7.2 User Stories
- As the user, I want to run a daily script to fetch and display account data so I can monitor my $600k portfolio.
- As the user, I want automated signals for BTC/XRP trades based on RSI so I can capitalize on trends.
- As the user, I want 5-year projections charted so I can visualize outcomes (e.g., $1.92M withdrawn in optimistic case).
- As the user, I want manual confirmation for trades so I maintain control and compliance.

## 8. Non-Functional Requirements
- **Performance:** Script runs in <5 minutes daily; handle up to 100 assets.
- **Security:** Use API keys/env vars; no credential storage; OAuth only.
- **Usability:** Command-line interface; optional GUI via matplotlib for charts.
- **Reliability:** Error handling for API failures; fallback to manual inputs.
- **Scalability:** Modular code for adding brokerages/assets.
- **Compliance:** Log all actions; no auto-trades without consent.
- **Maintainability:** Well-documented code; version control (e.g., Git).

## 9. Technical Specifications
- **Architecture:** Modular Python scripts (e.g., data_fetch.py, analysis.py, trade.py).
- **Technologies:**
  - Languages: Python 3.12.
  - Libraries: pandas (data), requests (APIs), ta (indicators), torch (ML), matplotlib (charts).
  - APIs: SnapTrade (unified), ccxt (crypto), yfinance (stocks).
- **Data Model:** JSON/CSV for storage; DataFrames for processing.
- **Deployment:** Local execution; schedule via cron/Windows Task Scheduler.
- **Testing:** Unit tests for functions; backtests on historical data.

## 10. Design and User Experience
- **UI/UX:** Text-based console outputs; ASCII/matplotlib charts for visualizations (e.g., portfolio growth bars).
- **Wireframes/Mockups:** (Conceptual) – Dashboard printout: Total Value: $XXX | Monthly Income: $YYY | Signals: BTC - Buy.
- **User Flows:**
  1. Run script → Fetch data → Analyze → Display suggestions → User confirms trades → Log results.

## 11. Timeline and Release Plan
- **Phase 1: Setup (Week 1-2):** API integrations, basic data fetch.
- **Phase 2: Core Features (Week 3-4):** Analysis and signals.
- **Phase 3: Advanced (Week 5-6):** Trading, projections, testing.
- **Phase 4: Launch (Month 2):** Beta with paper trading; full by Month 3.
- **Milestones:** MVP by End of Month 1; Full system by Month 3.
- **Estimated Release Date:** September 2025 (flexible for iterations).

## 12. Risks and Mitigations
- **Risk:** API changes/TOS violations – Mitigation: Use compliant third-parties; monitor updates.
- **Risk:** Market downturns – Mitigation: Conservative allocations; stop-losses.
- **Risk:** Data errors – Mitigation: Validation checks; manual overrides.
- **Risk:** Security breaches – Mitigation: Encrypted keys; no cloud storage without auth.
- **Dependencies Risks:** If SnapTrade unavailable, fallback to per-broker APIs.

## 13. Appendices
- **5-Year Projections (From Simulations):**
  - Conservative: Portfolio ~$600k, Total Income ~$360k.
  - Base: Portfolio ~$617k, Total Income ~$1.09M.
  - Optimistic: Portfolio ~$663k, Total Income ~$1.92M.
- **Sample Code Snippet (Data Fetch):**
  ```python
  import requests
  import pandas as pd

  def fetch_data(api_key):
      # Placeholder API call
      response = requests.get('https://api.example.com/holdings', headers={'Authorization': f'Bearer {api_key}'})
      return pd.DataFrame(response.json())
  ```
- **References:** User conversation history; standard PRD templates (e.g., Atlassian, Product School).

This PRD serves as a living document – update as development progresses or markets evolve. For implementation, consult professionals to ensure legal/financial compliance.