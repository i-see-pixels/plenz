# Go-to-Market & Community Launch Plan — PromptLens

| Field | Details |
| --- | --- |
| **Title/Initiative** | **PromptLens** — Open-Source AI Prompt Refinement Browser Extension |
| **Date & Version** | February 7, 2026 · v1.0 |
| **Parent Document** | PromptLens PRD v1.0 (Feb 7, 2026) |
| **Marketing POC** | *(To be assigned)* |
| **Community POC** | *(To be assigned)* |
| **Status** | Draft — Pending Review |

---

## 1. GTM Philosophy

PromptLens is **free, open-source, and has no monetization goal**. This fundamentally changes the go-to-market playbook. There is no paid acquisition budget, no conversion funnel, and no revenue target. Instead, the launch strategy is built around three growth engines:

1. **Community-led growth** — Open-source contributors, GitHub stargazers, and Discord members become organic evangelists.
2. **Content-driven distribution** — Technical blog posts, demo videos, and "Show HN" threads drive awareness through developer and AI-enthusiast channels.
3. **Product-led adoption** — The extension is so immediately useful that word-of-mouth among AI chat users becomes the primary growth channel post-launch.

### GTM Success Metrics (Mapped to PRD OKRs)

| Metric | 30-Day Target | 90-Day Target | 6-Month Target |
| --- | --- | --- | --- |
| Chrome Web Store installs | 5,000 | 18,000 | 50,000 |
| Firefox Add-ons installs | 500 | 2,000 | 5,000 |
| GitHub stars | 200 | 500+ | 500+ (PRD KR4) |
| GitHub contributors | 10 | 25 | 50+ (PRD KR4) |
| Discord members | 300 | 800 | 2,000 |
| Weekly Active Users (WAU) | 2,500 | 10,000 | 30,000 |
| Suggestion acceptance rate | 30% | 35% | 40% (PRD KR2) |
| Day-7 retention | 25% | 35% | 40% |

---

## 2. Target Audiences & Channels

### 2.1 Audience Segments

| Segment | Who | Where They Hang Out | What Resonates |
| --- | --- | --- | --- |
| **AI power users** | Daily ChatGPT/Claude users frustrated by poor outputs | r/ChatGPT, r/ClaudeAI, r/PromptEngineering, AI Twitter/X, YouTube AI channels | "Get better AI answers on the first try — no prompt engineering skills needed" |
| **Developers & OSS enthusiasts** | Engineers who contribute to open-source projects | Hacker News, GitHub Trending, r/webdev, r/programming, Dev.to, tech Discord servers | "Open-source, BYOK, MIT-licensed — no vendor lock-in, no data collection" |
| **Privacy-conscious users** | Professionals who refuse tools that proxy their data | r/privacy, r/selfhosted, Privacy-focused newsletters, Mastodon tech communities | "Your API key never leaves your browser. Zero data sent to our servers. Verify it yourself." |
| **Students & knowledge workers** | Marketers, writers, students who use AI daily but aren't technical | LinkedIn, Twitter/X, YouTube tutorials, TikTok AI tips, productivity blogs | "Like Grammarly, but for your AI prompts — works right inside ChatGPT" |
| **Tech content creators** | YouTubers, bloggers, newsletter authors covering AI tools | Direct outreach, press kits, early access | "New free tool your audience will love — makes a great tutorial/review topic" |

### 2.2 Channel Strategy

| Channel | Purpose | Frequency | Owner |
| --- | --- | --- | --- |
| **GitHub** | Primary project home; issues, PRs, discussions, releases | Continuous | Community POC |
| **Discord** | Real-time community hub; support, feedback, contributor chat | Continuous | Community POC |
| **Twitter / X** | Launch announcements, feature updates, engagement, memes | 3–5x/week | Marketing POC |
| **Reddit** | Launch posts, value-driven comments in relevant threads | Weekly (organic, not spammy) | Marketing POC |
| **Hacker News** | "Show HN" launch post, follow-up technical posts | 2–3 key posts total | Tech POC |
| **Product Hunt** | Major launch event for visibility spike | 1 launch (timed with v1.0) | Marketing POC |
| **Dev.to / Hashnode** | Technical blog posts, tutorials, architecture deep dives | Bi-weekly | Tech POC |
| **YouTube** | Demo video, setup tutorial, "before/after" prompt comparisons | 3–4 videos in first month | Marketing POC |
| **LinkedIn** | Professional audience, thought leadership on prompt engineering | 2x/week | Marketing POC |
| **Email / Newsletter** | Launch announcements, monthly updates to early adopters | Monthly | Marketing POC |
| **Chrome Web Store** | Primary distribution; ASO-optimized listing | Continuous optimization | Marketing POC |

---

## 3. Pre-Launch Phase (Feb 21 – Jul 19, 2026)

### 3.1 Community Infrastructure Setup (Feb 21 – Mar 14)

**Goal:** Build the community home before there's a community.

- [ ] **GitHub repository** — Public repo with:
  - Polished README (logo, description, one-liner value prop, GIF demo, installation instructions, tech stack badges)
  - CONTRIBUTING.md with contributor guide, code style, PR template
  - CODE_OF_CONDUCT.md (Contributor Covenant)
  - Issue templates: Bug Report, Broken Platform, Feature Request
  - CODEOWNERS file for automated review assignment
  - Project board (GitHub Projects) with public roadmap
  - "good first issue" labels on 10+ starter tasks
  - LICENSE (MIT)

- [ ] **Discord server** — Channels:
  - `#announcements` (read-only, team posts)
  - `#general` (open discussion)
  - `#support` (user help)
  - `#contributors` (dev discussion, PR coordination)
  - `#ideas` (feature suggestions)
  - `#showcase` (users share their before/after prompt improvements)
  - Roles: Maintainer, Contributor, Early Adopter, Community Member

- [ ] **Landing page** (Cloudflare Pages):
  - Domain: `promptlens.dev` (or similar)
  - Sections: Hero (value prop + demo GIF), Features, How It Works, Privacy Commitment, Open Source CTA, Email capture for launch notification
  - Built with Astro or plain HTML — fast, static, zero dependencies

- [ ] **Social accounts**:
  - Twitter/X: `@PromptLensOSS`
  - Product Hunt: "Coming Soon" page created
  - Dev.to organization page

### 3.2 Content Pipeline (Mar 15 – Jul 19)

Build a backlog of content to deploy around launch. All content is created in advance but published on a schedule.

| # | Content Piece | Format | Channel | Publish Timing |
| --- | --- | --- | --- | --- |
| 1 | "Why your AI gives bad answers (and how to fix it)" | Blog post | Dev.to, Hashnode, LinkedIn | 2 weeks pre-launch |
| 2 | "Building an open-source Grammarly for AI prompts" | Technical blog | Dev.to, Hacker News | 1 week pre-launch |
| 3 | "Introducing PromptLens" — launch announcement | Blog post | Landing page, Twitter, LinkedIn, Reddit | Launch day |
| 4 | 60-second demo video | Short video | Twitter, YouTube Shorts, TikTok, Product Hunt | Launch day |
| 5 | 5-minute full walkthrough video | Tutorial video | YouTube | Launch day |
| 6 | "How we built platform detection for 6+ AI chat sites" | Technical deep dive | Dev.to, Hacker News | Week 1 post-launch |
| 7 | "PromptLens architecture: zero-backend, BYOK, Shadow DOM" | Technical blog | Dev.to, Hashnode | Week 2 post-launch |
| 8 | "Before vs. After: 10 real prompts improved by PromptLens" | Listicle + screenshots | Twitter thread, Reddit, LinkedIn | Week 2 post-launch |
| 9 | "Contributing to PromptLens: add a new LLM provider in 30 minutes" | Contributor tutorial | Dev.to, GitHub README | Week 3 post-launch |
| 10 | "PromptLens vs. Prompt Perfect vs. AIPRM: honest comparison" | Comparison blog | Landing page blog, Reddit | Week 4 post-launch |

### 3.3 Pre-Launch Community Building (Apr – Jul)

| Activity | Timeline | Detail |
| --- | --- | --- |
| **Seed the GitHub repo** | Apr 6 (dev start) | Make the repo public on day 1 of development. Let people watch the project being built in the open. |
| **"Building in public" thread** | Apr–Jul (weekly) | Weekly Twitter/X thread showing progress: screenshots, code snippets, decisions made, trade-offs. Tag #BuildInPublic, #OpenSource, #AI. |
| **Early adopter email list** | Apr–Jul | Landing page email capture. Target: 500 subscribers by launch day. |
| **Alpha tester recruitment** | May 18 (alpha) | Invite 50 early adopters from the email list + Discord to test the alpha build. Provide a dedicated feedback channel. |
| **Beta tester community** | Jun 15 (beta) | Open Chrome Web Store beta to the email list first, then public. Encourage reviews. |
| **Contributor onboarding** | Jun–Jul | Host 2 "contributor office hours" sessions on Discord — walk through the codebase, assign good-first-issues live. |

### 3.4 Chrome Web Store ASO (App Store Optimization)

The Chrome Web Store listing is a critical discovery channel. Optimization should be treated like SEO.

**Listing Elements:**

| Element | Content |
| --- | --- |
| **Extension Name** | PromptLens — AI Prompt Enhancer (Open Source) |
| **Short Description** (132 chars) | Refine your AI prompts in real time. Works on ChatGPT, Claude, Gemini & more. Free, open-source, privacy-first. Bring your own key. |
| **Category** | Productivity |
| **Keywords in Description** | AI prompt, prompt engineering, ChatGPT extension, Claude extension, prompt optimizer, prompt enhancer, BYOK, open source, privacy |
| **Screenshots** (5 required) | 1. Inline suggestion overlay on ChatGPT. 2. Before/after prompt comparison. 3. Model configuration settings. 4. Popup with model toggle. 5. Privacy settings showing "stored locally" messages. |
| **Promo Tile** (440×280) | Clean design: Logo + "Better AI prompts, right where you type." |
| **Marquee Promo** (1400×560) | Hero image: split-screen showing vague prompt → enhanced prompt with PromptLens overlay |

**Firefox Add-ons listing** mirrors the Chrome listing with platform-appropriate adjustments.

---

## 4. Launch Day Plan (Jul 20, 2026)

### 4.1 Launch Day Timeline

All times in UTC to coordinate global reach.

| Time (UTC) | Action | Channel | Owner |
| --- | --- | --- | --- |
| 00:01 | Product Hunt launch goes live (scheduled the night before) | Product Hunt | Marketing POC |
| 00:15 | "Show HN: PromptLens — open-source Grammarly for AI prompts (BYOK, privacy-first)" | Hacker News | Tech POC |
| 00:30 | Launch announcement tweet thread (5 tweets: problem → solution → demo GIF → privacy → GitHub link) | Twitter/X | Marketing POC |
| 01:00 | Reddit posts (separate posts, genuine tone, not spammy): | Reddit | Marketing POC |
| | - r/ChatGPT: "I built a free extension that improves your prompts in real time" | | |
| | - r/ClaudeAI: "Open-source prompt enhancer that works right inside Claude" | | |
| | - r/PromptEngineering: "PromptLens: automated prompt refinement, BYOK, MIT-licensed" | | |
| | - r/selfhosted: "Privacy-first prompt tool — your API key never leaves your browser" | | |
| 01:30 | LinkedIn announcement post | LinkedIn | Marketing POC |
| 02:00 | Discord @everyone announcement with install link | Discord | Community POC |
| 02:00 | Email blast to subscriber list (~500 people) | Email | Marketing POC |
| 06:00 | Engage with all Product Hunt comments, HN comments, Reddit replies | All | Full team |
| 08:00 | Dev.to launch blog post goes live | Dev.to | Tech POC |
| 12:00 | Midday engagement check: reply to all new comments, retweet supporters | All | Full team |
| 14:00 | YouTube demo video published | YouTube | Marketing POC |
| 18:00 | Evening tweet: "X installs in the first 18 hours — thank you!" (with real numbers) | Twitter/X | Marketing POC |
| 23:59 | End-of-day metrics snapshot; plan Day 2 priorities | Internal | All |

### 4.2 Product Hunt Launch Optimization

| Element | Detail |
| --- | --- |
| **Tagline** | "Grammarly for AI prompts — free, open-source, privacy-first" |
| **First Comment** | Maker's story: the problem (under-prompting), why existing tools fell short, why we made it free and open-source, what's next on the roadmap |
| **Media** | 30-second demo GIF (hero), 5 screenshots, 5-minute walkthrough video |
| **Topics** | Artificial Intelligence, Developer Tools, Chrome Extensions, Open Source, Productivity |
| **Launch Day** | Tuesday (Jul 20 is a Monday — shift to Tuesday Jul 21 if needed for optimal PH traffic) |
| **Hunter** | Recruit a top-500 Product Hunt hunter 30 days in advance; provide them with a media kit |
| **Support mobilization** | Message email subscribers + Discord members with the PH link at 00:01 UTC. Ask for genuine upvotes and comments (never buy votes). |

### 4.3 Hacker News "Show HN" Strategy

| Element | Detail |
| --- | --- |
| **Title** | "Show HN: PromptLens – Open-source browser extension that refines your AI prompts in real time" |
| **Post body** | 3 paragraphs: (1) Problem — under-prompting causes bad AI outputs and context rot. (2) Solution — inline suggestions like Grammarly, BYOK, privacy-first, zero backend. (3) Tech details — TypeScript, Shadow DOM, provider adapter pattern, MIT licensed. GitHub link. |
| **Timing** | Post between 8–10 AM ET on a weekday for maximum HN traffic |
| **Engagement** | Founder/tech lead must stay online for 6+ hours replying to every comment. Transparent, technical, no marketing-speak. HN rewards authenticity. |
| **Follow-up post** (Week 2) | Technical deep-dive blog: "How we built platform detection for 6+ AI chat sites" — submit as a regular HN story |

---

## 5. Post-Launch Growth Strategy (Jul 21 – Jan 2027)

### 5.1 Week 1–4: Momentum Phase

| Week | Focus | Key Actions |
| --- | --- | --- |
| **Week 1** | Ride the launch wave | Reply to every comment/review. Fix critical bugs within 24h. Push 1–2 hot-fix releases. Share user testimonials on Twitter. |
| **Week 2** | Technical credibility | Publish architecture blog post. Submit to HN. Share on r/webdev and r/programming. |
| **Week 3** | Community onboarding | Host first "contributor office hours" on Discord. Merge first external PRs. Spotlight contributors on Twitter. |
| **Week 4** | Competitive positioning | Publish "PromptLens vs. Prompt Perfect vs. AIPRM" comparison blog. Share on Reddit and LinkedIn. |

### 5.2 Month 2–3: Deepening Phase

| Activity | Detail |
| --- | --- |
| **Feature releases** | Ship 1–2 community-requested features per month (e.g., new platform support, ghost text mode improvements). Each release gets a changelog blog post + tweet. |
| **"Prompt of the Week"** | Weekly Twitter/Discord post showing a real before/after prompt improvement. Encourages users to share their own. Uses #PromptLens hashtag. |
| **Content creator outreach** | Send personalized pitches to 20 AI-focused YouTubers/bloggers offering early access, a media kit, and a clear "why your audience will care" angle. |
| **SEO content** | Publish 4 blog posts targeting search intent: "how to write better ChatGPT prompts," "best ChatGPT Chrome extensions 2026," "prompt engineering for beginners," "how to reduce context rot in AI chats." Each post naturally mentions PromptLens. |
| **Conference/meetup presence** | Submit talk proposals to AI/dev meetups: "Building an Open-Source AI Assistant Inside the Browser" — demo PromptLens live. |

### 5.3 Month 4–6: Scale Phase

| Activity | Detail |
| --- | --- |
| **Localization** | Community-driven translations: start with Spanish, French, German, Japanese, Portuguese, Chinese. Localize the Chrome Web Store listing first (highest ROI), then in-extension UI copy. |
| **Education partnerships** | Reach out to AI/ML bootcamps, university courses, and coding schools. PromptLens is free and open-source — ideal for teaching prompt engineering. Provide a "Getting Started for Educators" guide. |
| **Hacktoberfest / OSS events** | Prepare a batch of "good first issues" for Hacktoberfest (Oct 2026). Tag issues appropriately. Create a dedicated Hacktoberfest section in CONTRIBUTING.md. |
| **Platform expansion** | Add support for emerging AI platforms (Grok, DeepSeek, etc.) based on community requests. Each new platform support = a mini-launch announcement. |
| **v1.1 / v1.2 releases** | Major feature releases (e.g., customizable system prompts, local model support via Ollama). Each release is a content event: blog + tweet thread + Discord announcement + changelog. |

---

## 6. Community Building Playbook

### 6.1 Contributor Funnel

```
Star the repo (awareness)
    │
    ▼
Open an issue / join Discord (engagement)
    │
    ▼
Claim a "good first issue" (first contribution)
    │
    ▼
Submit a PR → get merged (contributor)
    │
    ▼
Review others' PRs / mentor newcomers (maintainer)
    │
    ▼
Community ambassador (evangelist)
```

### 6.2 Contributor Experience Design

| Touchpoint | Experience |
| --- | --- |
| **First visit to repo** | README answers "What is this? → Why should I care? → How do I install it? → How do I contribute?" in under 60 seconds |
| **First issue** | "good first issue" label on 10+ tasks at all times. Each issue has: clear description, expected behavior, relevant file paths, difficulty estimate |
| **First PR** | PR template asks: What does this change? How was it tested? Screenshots (if UI change). Maintainer reviews within 48 hours. Constructive, kind feedback |
| **First merge** | Automated "Thank you" comment from GitHub Actions bot. Contributor added to CONTRIBUTORS.md. Shout-out in next Discord announcement |
| **Ongoing contribution** | Contributors who merge 3+ PRs are invited to the "Contributors" Discord role. 10+ PRs → offered "Maintainer" role with review permissions |

### 6.3 Community Rituals

| Ritual | Frequency | Detail |
| --- | --- | --- |
| **Contributor Spotlight** | Monthly | Blog post / Twitter thread highlighting a contributor's work, their background, and what they built. Makes contributors feel valued and inspires others. |
| **Office Hours** | Bi-weekly | Live Discord voice/video session. Maintainers walk through open issues, answer questions, pair-program with newcomers. |
| **Release Party** | Per release | Discord event celebrating a new release. Maintainers demo new features. Contributors who shipped features get credit. |
| **"Prompt of the Week"** | Weekly | Community members share their best before/after prompt improvements on Discord #showcase. Best one gets retweeted/featured. |
| **Roadmap Vote** | Quarterly | Community votes on the next quarter's top 3 features via GitHub Discussions poll. Results are binding — builds trust that the community shapes the product. |

### 6.4 Community Health Metrics

| Metric | Target (6 months) | Measurement |
| --- | --- | --- |
| GitHub stars | 500+ | GitHub API |
| Unique contributors (PR merged) | 50+ | GitHub Insights |
| Median time to first PR review | < 48 hours | GitHub Actions bot tracking |
| Open issue resolution rate | > 70% resolved within 14 days | GitHub Issues |
| Discord monthly active members | 500+ | Discord analytics |
| Contributor NPS (quarterly survey) | > 60 | Survey (Tally / Google Forms) |

---

## 7. Messaging & Positioning

### 7.1 Core Positioning Statement

> **PromptLens** is the free, open-source browser extension that refines your AI prompts in real time — like Grammarly, but for ChatGPT, Claude, and Gemini. Bring your own API key. Your data never leaves your browser.

### 7.2 Messaging by Audience

| Audience | Primary Message | Proof Point |
| --- | --- | --- |
| **AI power users** | Get better AI answers on the first try — no prompt engineering skills needed. | "Users who accept suggestions send 30% fewer follow-up messages." |
| **Developers / OSS** | Free, MIT-licensed, plugin architecture. Add a new LLM provider in 30 minutes. | GitHub repo: TypeScript, provider adapter pattern, 80%+ test coverage. |
| **Privacy-conscious** | Your API key and prompts never leave your browser. Zero data collection. Verify it yourself. | Open-source code + CSP restrictions + "View network activity" in settings. |
| **Students / writers** | Like autocomplete for your AI prompts. Type a rough idea → get a polished prompt. | Before/after demo: "write me an email" → professional, constrained prompt. |
| **Content creators** | Free tool your audience will love. Makes a great tutorial or review topic. | Media kit with screenshots, demo GIF, key stats, talking points. |

### 7.3 Key Differentiators vs. Competitors

| Talking Point | PromptLens | Typical Competitor |
| --- | --- | --- |
| Price | Free forever. No freemium. No paywall. | Free tier with limits → paid upgrade ($5–20/mo) |
| Open source | MIT license. Full code transparency. | Closed source |
| Privacy | All processing client-side. No PromptLens server. | Prompts routed through vendor's servers |
| Model flexibility | BYOK: OpenAI, Anthropic, Google, Mistral, Groq, OpenRouter, Custom | Locked to one provider or vendor's own API |
| UX | Inline suggestions with one-keystroke accept (like Grammarly) | Button-click to trigger; side panel; copy-paste |
| Community | Open roadmap, contributor program, community-driven features | Closed roadmap, no contribution path |

---

## 8. Media Kit & Assets

Prepare a media kit available at `promptlens.dev/press` (or `/media`) for content creators, journalists, and bloggers.

### 8.1 Media Kit Contents

| Asset | Format | Description |
| --- | --- | --- |
| **Logo pack** | SVG, PNG (light/dark, full color/monochrome) | All logo variants for articles, videos, thumbnails |
| **Screenshots** | PNG (1280×800, 2x retina) | 5 key screenshots: overlay on ChatGPT, before/after, settings, popup, privacy page |
| **Demo GIF** | GIF + MP4 (30 seconds) | Shows: type vague prompt → suggestion appears → Tab to accept → enhanced prompt |
| **Demo video** | MP4 (5 minutes) | Full walkthrough: install → sign in → configure model → use on ChatGPT → accept suggestion |
| **One-pager** | PDF | Single-page overview: what it is, who it's for, key features, links |
| **Key stats** | Text/PDF | Install count, GitHub stars, suggestion acceptance rate, contributor count (updated monthly) |
| **Talking points** | Text | 5 key messages for interviewers/reviewers to reference |
| **Brand guidelines** | PDF | Logo usage, color codes, font specs, do's and don'ts |

### 8.2 Content Creator Outreach Template

```
Subject: Free tool your audience will love — PromptLens (open-source AI prompt enhancer)

Hi [Name],

I'm [Your Name] from the PromptLens team. We built a free, open-source Chrome/Firefox
extension that refines AI prompts in real time — like Grammarly, but for ChatGPT, Claude,
and Gemini.

I think your audience would find it genuinely useful because:
- It's completely free (no paywall, no upsell)
- It works inline — no copy-paste, no separate app
- Users bring their own API key — full privacy, no data leaves the browser

Here's a 30-second demo: [GIF/video link]
Full media kit: promptlens.dev/press

Would you be interested in trying it out? Happy to provide early access, answer any
questions, or jump on a quick call.

Best,
[Your Name]
```

---

## 9. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Low launch-day traffic | Medium | Medium | Pre-build email list (500+), Discord community (200+), and Twitter following before launch. Don't rely on a single channel. |
| Product Hunt launch underperforms | Medium | Low | PH is one channel, not the only channel. HN, Reddit, and Twitter can compensate. Plan for a re-launch after 6 months with a major feature update. |
| Negative early reviews (bugs) | Medium | High | Run a 5-week beta (Jun 15–Jul 19) to catch critical bugs. Have hot-fix release process ready (< 24h turnaround). Respond to every review personally. |
| Reddit posts removed as self-promotion | Medium | Low | Write genuine, value-first posts (not "check out my tool"). Engage in communities before launch day. Follow subreddit rules precisely. |
| Low contributor adoption | Medium | Medium | Maintain 10+ "good first issues" at all times. Host bi-weekly office hours. Spotlight contributors publicly. Make the first PR experience delightful. |
| BYOK requirement confuses casual users | High | Medium | Onboarding includes step-by-step API key tutorial with direct links to provider sign-up pages. Add "Don't have an API key?" guidance. |
| Content creators don't respond | Medium | Low | Outreach to 20+ creators; expect 20% response rate (4+ reviews). Provide a frictionless media kit so they can create content independently. |

---

## 10. Budget

PromptLens is a zero-revenue, open-source project. The budget is minimal.

| Item | Cost | Frequency | Notes |
| --- | --- | --- | --- |
| Chrome Web Store developer account | $5 | One-time | Required for publishing |
| Firefox Add-ons developer account | $0 | — | Free |
| Domain (`promptlens.dev`) | ~$12 | Annual | Landing page + press kit |
| Cloudflare Pages hosting | $0 | — | Free tier |
| Figma (design) | $0 | — | Free tier sufficient |
| Video recording/editing tool | $0 | — | OBS (free) + DaVinci Resolve (free) |
| Beta user testing incentives | ~$200 | One-time | $20 gift cards × 10 testers |
| Stickers/swag for contributors | ~$150 | One-time | Hex stickers + PromptLens branded items for top contributors |
| **Total** | **~$367** | | |

---

## 11. Launch Timeline (Consolidated)

| Date | Milestone | Key Deliverables |
| --- | --- | --- |
| **Feb 21** | Stakeholder approval | GTM plan approved; roles assigned |
| **Mar 14** | Community infra ready | GitHub repo (public), Discord server, landing page, social accounts, email capture live |
| **Apr 6** | Development starts; repo goes public | "Building in public" begins — weekly Twitter threads |
| **May 18** | Alpha release | 50 alpha testers recruited from email list + Discord |
| **Jun 1** | Content pipeline complete | All 10 content pieces drafted and scheduled |
| **Jun 15** | Beta launch (Chrome Web Store) | Chrome Web Store listing live; beta announced to email list + Discord |
| **Jun 22** | Beta feedback round 1 | Usability survey sent; first round of bug fixes |
| **Jul 6** | Firefox release | Firefox Add-ons listing live |
| **Jul 14** | Pre-launch push | Product Hunt "Coming Soon" page promoted; creator outreach emails sent; HN post drafted |
| **Jul 20** | **🚀 v1.0 LAUNCH DAY** | Product Hunt, Hacker News, Reddit, Twitter, LinkedIn, YouTube, Dev.to, email blast — all channels go live |
| **Jul 21–Aug 17** | Post-launch momentum (Week 1–4) | Daily engagement; technical blog posts; first contributor office hours; comparison blog |
| **Aug–Sep** | Deepening phase | Feature releases, SEO content, creator reviews, meetup talks |
| **Oct** | Hacktoberfest | Batch of "good first issues" for new contributors |
| **Oct–Jan 2027** | Scale phase | Localization, education partnerships, v1.1/1.2 releases, quarterly roadmap vote |

---

## 12. Post-Launch Review Cadence

| Review | Timing | Participants | Focus |
| --- | --- | --- | --- |
| **Daily standup** | Launch day through Day 7 | Full team | Bug triage, review/comment responses, metrics check |
| **Weekly retro** | Weeks 2–8 | Full team | What's working, what's not, channel performance, community health |
| **Monthly growth review** | Monthly (ongoing) | Leads | Install growth, WAU, retention, contributor count, content performance |
| **Quarterly strategy review** | Every 3 months | Leads + community ambassadors | Roadmap vote results, major feature planning, community feedback synthesis, OKR progress |

---

## Related Documents

1. **PromptLens PRD v1.0** — Product requirements, user stories, success metrics
2. **PromptLens Tech Planning v1.0** — Architecture, sprint plan, CI/CD
3. **PromptLens Design Planning v1.0** — UI specs, design system, user testing plan
4. GitHub Repository Setup Checklist *(to be created)*
5. Content Calendar (detailed) *(to be created)*
6. Media Kit Assets *(to be created)*

---

*Document Version: 1.0 · Date: February 7, 2026 · Status: Draft — Pending Review*
