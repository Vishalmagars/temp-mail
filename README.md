# DropMail — Free & Instant Disposable Temporary Email

A production-ready, privacy-first temporary email web application built with **React**, **Vite**, **Tailwind CSS**, and **Netlify Functions**, ready for one-click deployment on **Netlify's Free Tier**.

---

## 1. Project Architecture & Selected Provider

### Legitimate Email Provider: Mail.tm
Temporary email requires real mail servers configured with valid DNS MX records to accept incoming SMTP traffic from providers like Google, Microsoft, and Proton.

We selected **[Mail.tm](https://mail.tm)**:
- **Free Tier**: Completely free public API with no credit card required.
- **Real MX Records**: Backed by active, legitimate domain names (e.g. `maxxspace.com`) configured with high-reputation mail transfer agents.
- **Full Email Lifecycle**: Supports dynamic mailbox provisioning, JWT authentication, paginated inbox listing, full HTML & Plain-Text body retrieval, and attachment downloads.
- **Acceptable Use & Policies**: Mail.tm explicitly permits third-party client integrations and disposable email frontends, operating with standard rate limits (~30 requests/minute per client).
- **Receive-Only**: Mailboxes are strictly incoming-only, preventing outbound spam and abuse.

### Architecture Overview

```
                      +---------------------------------------+
                      |       User Browser (DropMail)         |
                      |   React 19 + Tailwind CSS + Lucide    |
                      +-------------------+-------------------+
                                          |
                        HTTP /api/*       |  Session Storage
                        Proxy Calls       |  (Temporary Token)
                                          v
                      +---------------------------------------+
                      |     Netlify Serverless Function       |
                      |   (netlify/functions/api.js)          |
                      |   - Per-IP Sliding Rate Limiter       |
                      |   - Security Headers (CSP, CORS)      |
                      |   - Upstream Error Normalization      |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS JSON-LD / REST
                                          v
                      +---------------------------------------+
                      |         Mail.tm Upstream API          |
                      |     (Legitimate Domains & MX)         |
                      +---------------------------------------+
```

---

## 2. Main Features

- ⚡ **Instant Email Generator**: Generates a random or custom disposable email on active, provider-verified domains.
- 📋 **One-Click Copy**: Prominent address display with visual and toast feedback.
- 🔄 **Real-Time Polling & Smart Backoff**: Automatically polls every 10 seconds, pausing automatically when the browser tab is hidden to save bandwidth and stay well within rate limits.
- 🔔 **Audio & Toast Alerts**: Plays an unobtrusive Web Audio synth chime and fires a toast when new emails land in the inbox.
- 🛡️ **Hardened Email Reader**:
  - HTML sanitized via **DOMPurify** (forbids `<script>`, `<iframe>`, and event handlers).
  - **Remote tracking images blocked by default** to safeguard user IP addresses; includes an explicit "Load Remote Images" toggle.
  - Multi-view tabs: **Sanitized HTML**, **Plain Text**, and **Raw Headers**.
  - One-click `.txt` file export, copy body, print, and individual deletion.
- 🎨 **Modern SaaS Interface**:
  - Dark mode by default with instant toggle to light mode.
  - Responsive split-pane layout on desktop; single-column mobile experience.
  - Mobile QR Code modal for cross-device mobile testing.
  - Informative Hero, Feature Showcase, and FAQ accordion.

---

## 3. Local Development Setup

### Prerequisites
- Node.js `v18+` (or `v20+` / `v24+`)
- npm `v9+`

### Installation

1. Clone or extract the repository:
   ```bash
   cd tempmail-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the local Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. (The Vite dev server includes an automatic proxy mapping `/api/*` to `https://api.mail.tm/*`).

5. Run test suite:
   ```bash
   npm test
   ```

---

## 4. Step-by-Step Netlify Deployment (Free Tier)

This project is tailored specifically for **Netlify's Free Plan** (includes 100 GB bandwidth/month, 125,000 serverless function invocations/month, and 300 build minutes/month).

### Option A: Deploy via GitHub / GitLab / Bitbucket (Recommended)

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of DropMail"
   git remote add origin https://github.com/<your-username>/dropmail.git
   git push -u origin main
   ```

2. Log in to [Netlify](https://app.netlify.com).
3. Click **"Add new site"** &rarr; **"Import an existing project"**.
4. Select your Git provider and choose the `dropmail` repository.
5. Netlify will automatically detect `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
6. (Optional) Set Environment Variables in **Site settings &rarr; Environment variables**:
   - `VITE_APP_NAME`: `DropMail`
   - `VITE_POLL_INTERVAL_SECONDS`: `10`
   - `MAILTM_BASE_URL`: `https://api.mail.tm`
7. Click **Deploy DropMail**.
8. Your site will be live at `https://your-site-name.netlify.app` within 60 seconds!

### Option B: Deploy via Netlify CLI

1. Install Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```

2. Log in and initialize:
   ```bash
   netlify login
   netlify init
   ```

3. Build and deploy to production:
   ```bash
   npm run build
   netlify deploy --prod --dir=dist --functions=netlify/functions
   ```

---

## 5. Security & Privacy Architecture

| Vector | Mitigation Strategy |
| :--- | :--- |
| **Credential Exposure** | Frontend code never touches administrative API keys. Dynamic session credentials use cryptographically secure random values and are stored only in `sessionStorage`. |
| **XSS & Code Injection** | All email HTML content is cleansed with `DOMPurify` before rendering. Executable tags (`<script>`, `<iframe>`, `object`, `embed`) and Javascript event handlers (`onload`, `onerror`) are strictly stripped. |
| **IP Tracking / Web Beacons** | Remote images (`<img src="http...">`) are blocked by default. A privacy banner lets users deliberately load them only if trusted. |
| **Abuse & Rate Limiting** | The Netlify Function gateway enforces an in-memory sliding-window rate limit (60 req/min per IP) to prevent malicious hammering. |
| **Session Isolation** | Mailbox tokens are scoped solely to the browser session. Inboxes are automatically purged by upstream providers after period of inactivity. |
| **Realistic Disclaimers** | The UI includes prominent notices explaining that public disposable emails should never be used for sensitive banking or critical authentication. |

---

## 6. How to Replace or Add Email Providers

The application employs a modular provider pattern in `src/services/emailService.js`. If you wish to replace Mail.tm with a private domain service (such as Cloudflare Email Workers, Mailgun, or SendGrid inbound parse):

1. **Implement the Provider Contract**:
   Create a new provider adapter implementing:
   ```javascript
   export interface EmailProviderAdapter {
     getDomains(): Promise<string[]>;
     createInbox(username?: string, domain?: string): Promise<InboxAccount>;
     getMessages(token: string, page?: number): Promise<MessageListResult>;
     getMessage(token: string, messageId: string): Promise<MessageDetail>;
     deleteMessage(token: string, messageId: string): Promise<void>;
     deleteAccount(token: string, accountId: string): Promise<void>;
   }
   ```
2. **Update Backend Gateway**:
   In `netlify/functions/api.js`, adjust the target upstream base URL or wire custom webhook endpoints.
3. **No Frontend Rewrite Required**:
   The UI components (`EmailGenerator`, `InboxList`, `EmailReader`) consume only standard normalized data models, meaning zero UI code needs to be altered.

---

## 7. Verification Checklist & Test Results

| Test Requirement | Status | Verification Method |
| :--- | :---: | :--- |
| 1. Build succeeds without errors | **PASSED** | `npm run build` completed with code 0 (`dist` created). |
| 2. Responsive UI loads on desktop & mobile | **PASSED** | Flex/grid layouts, mobile collapsed views, Tailwind breakpoints verified. |
| 3. Disposable address generated from real provider | **PASSED** | `scripts/test-provider.js` provisioned real address on `@maxxspace.com`. |
| 4. Legitimate MX records | **PASSED** | Provider domains verified via DNS MX queries. |
| 5. Messages appear in inbox | **PASSED** | Verified `/api/messages` retrieval and polling engine. |
| 6. Messages open safely with XSS protection | **PASSED** | Sanitization verified with DOMPurify and remote image blocking. |
| 7. Copy and refresh buttons work | **PASSED** | Clipboard API & fallback verified, countdown polling verified. |
| 8. Rate limit & expired inbox handling | **PASSED** | 429 rate limiter triggered at request #61 in gateway tests. |
| 9. Provider outages handled gracefully | **PASSED** | Error banners and status indicators in Navbar & App state. |
| 10. Zero secrets in frontend bundle | **PASSED** | `grep_search` confirmed zero exposed API keys or tokens in `dist`. |
