---
type: output
status: draft
created: 2026-05-11
author: claude
contributors: [jason-jones]
audience: [Architecture group, technical decision-makers, Burtscher review]
purpose: Deep technical research on Microsoft Copilot People Skills as candidate substrate for Skills Intelligence lighthouse
---

# Skills Intelligence Lighthouse · Copilot People Skills technical viability research

A deep technical investigation of Microsoft Copilot People Skills as a candidate substrate for the Skills Intelligence lighthouse. Specifically: can it be extended with custom skills, can it ingest external data (LTO, Kantata, Limb, Spark), and what does the licence model actually look like at NCC scale?

This document supports the **AR1 architecture choice** decision (currently pending blocker on the backlog) and the **Q0 working session** with the architecture group.

---

## TL;DR

Microsoft Copilot People Skills is **technically viable as one input layer**, but **cannot serve as the primary substrate** for the lighthouse in its current form (May 2026).

Five facts that shape the decision:

1. **Custom skills can be imported** - hard cap of 5,000 custom skills (LTO's 300 fits), but with material constraints: English-only names and descriptions, 200-character description limit, **no proficiency levels**, **no hierarchies**, no prerequisites.
2. **The inference engine only sees Microsoft 365 Graph signals** - emails, documents, Teams messages, calendar. It **does not read Kantata, Limb, Spark, Salesforce, or LinkedIn**. Microsoft Graph Connectors feed Copilot retrieval but **do not feed the People Skills inference engine**. This is documented and unambiguous.
3. **Output is binary** - "user has skill X" or not. No confidence score, no evidence trail, no proficiency rubric, no manager-validation workflow.
4. **Licence is per-seat, included with M365 Copilot OR Viva Suite OR (with caveats) M365 E3/E5** - it does not have a separate SKU. Hybrid path (Copilot for power users + E3/E5 inferencing toggle for inferred-about consultants) is the cheapest viable option at ~£60k/year for full coverage vs ~£533k/year for Copilot-for-everyone.
5. **The vault's "£1m/yr at full coverage" figure is overstated** for People Skills alone. The honest UK cost at NCC scale is £533k/year if everyone gets Copilot, or ~£60k/year on the hybrid pattern.

**Architectural recommendation:** treat People Skills as **a free augmentation layer**, not the substrate. Build the Skills Intelligence capability as a Copilot Studio (or Foundry) agent that consumes People Skills via Microsoft Graph Profile API **plus** Kantata, Limb, Spark, Workday and other sources via custom connectors. This preserves the LTO 5-level rubric in NCC's own logic, produces evidence trails, and uses People Skills where it's strongest (in-flow-of-work UX via Copilot, profile cards, Org Explorer) without paying for it as a constraint.

This is option (c) from the AR1 four-option list, augmented with bits of (a). It is **not** option (b) ("Workday Skills") or option (d) ("Bespoke build") in pure form.

---

## 1. Skills library - can it be extended?

### What it ships with

Copilot People Skills comes with **16,000+ skills** produced in partnership with LinkedIn. Each skill has a description, related skills, hierarchy position in the built-in taxonomy, and typical role mappings. All 16,000 are pre-selected by default; minimum supported is 500 ([Microsoft Learn · Set up People Skills](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-setup)).

### Can it be extended with custom skills

**Yes, with hard caps.** Custom skills are imported via two-file CSV upload (skills library + optional role-to-skill mapping) by an AI Administrator or Knowledge Administrator. Local file upload was added in March 2026; previously required a SharePoint document library ([Microsoft Tech Community · Expanding skills intelligence](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/people-skills-expanding-skills-intelligence-to-more-users-and-surfaces-across-mi/4497646)).

**Documented hard limits:**

| Constraint | Limit | Implication for LTO |
|---|---|---|
| Custom skills count | Min 20, max 5,000 | LTO's 300 skills fit comfortably |
| Skill name | Max 50 characters | Should fit most LTO skill names |
| Skill description | Max 200 characters | Tight for compliance-grade rubric descriptions |
| Language | English (en_US) only | **Hard blocker for any French / German / Dutch deliveries** |
| File size | Max 100 MB per file | Trivial constraint |

Reference: [Microsoft Learn · Manage custom skills](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-manage-custom-skill).

### Can the default library be replaced

Effectively yes. Admins can choose *Advanced setup with custom skills library* and deselect the LinkedIn taxonomy entirely. The 20-5,000 cap still applies. **Where duplicates exist between custom and default, custom wins** - documented Microsoft behaviour ([Microsoft Learn · Set up People Skills](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-setup)).

### Custom hierarchies, prerequisites, proficiency levels

**No, no, and no.** The custom skills CSV schema supports only: Skill ID, Name, Description, Restricted Skill (Yes/No). The optional mapping file only supports Job Title → Skill ID pairs. There is no field for:

- Parent / child skill relationships
- Prerequisite skills
- Proficiency levels or scoring rubric
- Skill clusters or capability groupings
- Recency requirements

The built-in LinkedIn taxonomy has hierarchy that admins can browse, but **custom skills cannot declare hierarchy in the import**.

**Proficiency is the headline gap.** People Skills is binary - a user either has a skill or doesn't. There is no native concept of skill level. Confirmed by Microsoft documentation and validated by analyst commentary:

> *"People Skills focuses mainly on identifying the presence of skills but does not measure skill proficiency levels effectively."* - Everest Group ([blog post](https://www.everestgrp.com/blog/microsofts-people-skills-and-skills-agent-a-step-forward-but-not-yet-complete-blog.html))

> *"Skills are binary, meaning no proficiency level is built into the People Skills framework."* - Storyals ([blog](https://blog.storyals.com/introducing-people-skills-in-microsoft-365))

The only workaround is to encode proficiency in the skill name itself (e.g. *"LTO-Penetration Testing - Level 3"*), which inflates the skill count and breaks aggregation. For 300 LTO skills at 5 levels each that's 1,500 skills - still under the 5,000 cap, but ugly.

### Tagging skills as AI-restricted

**Yes, first-class feature.** Any custom skill can be flagged Restricted Skill = Yes in the import template. Restricted skills:

- Are **removed from user profiles within 24 hours** of being marked
- Are **never added by AI inferencing**
- Can still be manually added by a user
- Some are pre-flagged by Microsoft (e.g. politically/religiously sensitive)

Reference: [Microsoft Learn · Manage AI-restricted skills](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-manage-ai-restricted-skills).

This is useful for cyber-specific sensitive skills (red-team TTPs, specific attack techniques, classified-engagement skills) but does not solve the broader sensitive-customer-data problem (which lives at the Limb level, not the skill level).

### Workday Skills Cloud sync

**No native bidirectional sync exists as of May 2026.** What does exist:

- **Org Data Upload from Workday → M365**, one-way. Brings org structure, job titles, and user skills (as `Microsoft_UserSkillNames` attribute). Reference: [Microsoft Learn · Import org data from Workday](https://learn.microsoft.com/en-us/viva/import-org-data-workday).
- **Workday + Microsoft partnership announced 16 September 2025** is about Agent System of Record (registering Copilot Studio agents in Workday) - **not skills synchronisation**. Reference: [Workday press release](https://newsroom.workday.com/2025-09-16-Workday-and-Microsoft-to-Deliver-Unified-AI-Agent-Experience-for-the-Enterprise).
- **Josh Bersin's April 2026 analysis** of Workday's reinvention notes that Workday is repositioning as the *"platform of agents"* and explicitly contests Microsoft for skills primacy via Sana, Paradox, and Skills Cloud. Deep convergence between People Skills and Workday Skills Cloud is unlikely in the near term. Reference: [Josh Bersin · The Reinvention of Workday](https://joshbersin.com/2026/04/the-reinvention-of-workday-from-system-of-record-to-platform-of-agents/).

**Important:** the Org Data ingestion path **flattens skills to a name list per user**. Proficiency levels held in Workday Skills Cloud do not survive the trip to M365. So even if NCC pushes LTO into Workday with rubric levels, the People Skills side loses those.

---

## 2. Data sources - what can it actually see?

### What the inference engine reads

Microsoft documents the inputs explicitly ([Microsoft Learn · AI Inference engine](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-ai-inferencing)):

- Microsoft Graph + AI Graph: user profiles, job titles, collaboration signals
- **Key phrases from emails, meetings, and documents** (subject to activity window and consent)
- Microsoft Skills Graph (the LinkedIn-derived vocabulary)
- M365 user profile metadata: job titles (from Entra ID), top contacts

**Verbatim constraint from Microsoft:**

> *"Currently, we only infer skills from Microsoft 365 sources and don't use user activity in other line of business applications."*

This is the headline finding. **Kantata, Limb, Spark, Salesforce, LinkedIn, ATS Pinpoint, Digital Briefcase - none of these are read by the People Skills inference engine.**

### Refresh cadence

- Initial inference: 48 hours typical, up to 5 days max
- M365 Copilot or Viva Suite users: **30-day refresh**
- M365 E3/E5 users (no Copilot, with toggle on): **180-day refresh** - deliberate downgrade
- Activity window: the engine **does not consider user activity older than 90 days**

The 30-day refresh means inference is *recent* but not real-time. The 180-day refresh on E3/E5 is the cost-saving tier - inferred-about users get coverage at no additional licence cost but with stale data.

### Can data from outside the M365 tenant influence inference

**Not the inference engine directly.** External data can be staged into M365 via several routes, each with different consequences:

| Method | What it does | Constraint |
|---|---|---|
| **Org Data Ingestion CSV** (`Microsoft_UserSkillNames`) | Bulk-import per-user skill *assignments* | Skill names must exactly match the skills library (en_US); imported skills show as *"Imported by your organization"* until user confirms; **does not feed the inference engine** - just pre-populates profiles |
| **M365 Copilot Connectors for People Data** (Graph people connectors) | Bring authoritative profile data from external HR/recruiting/talent systems | Schema requires Entra ID account linkage; skills imported are read-only and merge with editable skills; powers profile cards, Search, Copilot, Org Explorer |
| **Microsoft Graph Profile API** (`profile/skills`) | Read/write user skills programmatically | Only **confirmed skills** can be exported; AI-generated skills cannot be exported; this is the back-door route to push curated skills onto profiles |
| **Microsoft 365 Copilot Connectors (Graph Connectors)** | Index external documents/structured records into the M365 substrate | Affects Copilot retrieval and Microsoft Search but **does not feed the People Skills inference engine** - documented as M365-only |
| **Copilot Studio agent** | Build a custom agent that calls Kantata/Limb/Spark APIs at runtime | Doesn't write into People Skills; runs alongside as a separate retrieval/reasoning layer; Copilot Credits / per-call metering applies |

Sources: [People connectors · Microsoft Graph](https://learn.microsoft.com/en-us/graph/peopleconnectors), [Connectors overview](https://learn.microsoft.com/en-us/microsoftsearch/connectors-overview), [Cost considerations](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/cost-considerations).

### Practical implication for LTO

To get an LTO score into People Skills, NCC has three options:

1. **Push the *outcome* (skill confirmed) via Profile API or Org Data CSV.** The user must still confirm it. Once confirmed it's indistinguishable from any other confirmed skill - **no level/score attached**. This loses the rubric.
2. **Push LTO into Workday Skills Cloud, then sync to M365 via Org Data ingestion.** Same outcome - rubric levels flatten to skill names only.
3. **Build a parallel Copilot Studio agent** that has access to both People Skills (via Graph) and LTO scores (via a custom connector). The agent reasons over both at query time and presents level-aware results. This preserves rubric in NCC's own logic.

Option 3 is the architecturally sound path. Options 1 and 2 lose the thing that makes LTO compliance-grade.

### Non-text data

The inference engine cannot ingest non-text business data (allocation records, skill ratings, training completion records, project history) directly. The only routes are:

- Stage as Org Data CSV (lossy - flattened to skill-name list per user)
- Consume at query time via a separate Copilot Studio agent

There is no documented pattern for streaming Kantata project events or Spark training completions into People Skills inference.

### Microsoft Purview interaction

Purview classifies M365 content and can apply labels. **Content tagged as Confidential under Purview is still in scope for People Skills inference unless excluded via Feature Access Management settings** ([Microsoft Learn · AI Inference engine](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-ai-inferencing)).

For NCC's customer-confidential work in Limb (and any classified work surfaced in M365), Purview labels alone won't stop inference. The lever is to **exclude in-scope users from the inference scope entirely** (via the new 2026 admin scoping feature) or to **tag specific skills as AI-restricted** so they never get inferred.

For cyber-specific classified work, this matters: red-team consultants may want their work-product *not* to surface as skill signals. The lever exists; the policy needs to be defined.

---

## 3. Inference engine details

### Model and approach

Microsoft documents that *"the inference engine uses advanced OpenAI LLM models and a proprietary inferencing approach with relevant Microsoft Graph data"* and *"a proprietary inferencing approach based on principles of game theory and multi-agent frameworks executing multi-directional inference runs across relevant Microsoft Graph data"* with *"simulated agent personas"* ([Microsoft Tech Community · GA announcement](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/announcing-people-skills-general-availability-and-new-skills-agent/4406364)).

The specific model version is **not disclosed**.

### Confidence and evidence

- **No confidence score exposed to admins or users.** Inferred skills appear as candidate suggestions on the user's profile.
- **No evidence trail exposed.** The user sees the inferred skill but not which email, document, or meeting produced it. AI transparency documentation explains the *categories* of signal used but not which specific artefact drove which inference.
- **Microsoft's only public accuracy metric** is a self-reported user-confirmation rate of *"around 80%+ accuracy"* from early adopters - which is a confirm-rate, not a model-output confidence.

This is a **hard blocker for any audit-grade use case**. NCC's LTO process is compliance-grade with calibration and GPL approval; People Skills' inference output is not audit-trail-grade.

### Validation workflow

**Self-review only.** Users confirm or remove inferred skills on their own profile. **There is no manager-approval, HR-validation, or formal-review workflow.** Customer feedback in the GA announcement comments thread requests exactly this; Microsoft has not committed publicly.

Analyst confirmation:

> *"Skill validation primarily relies on employee self-review and confirmation… without structured validation mechanisms, such as manager reviews or formal assessments, the reliability of the inferred skills data could be questionable."* - Everest Group ([blog post](https://www.everestgrp.com/blog/microsofts-people-skills-and-skills-agent-a-step-forward-but-not-yet-complete-blog.html))

### Augmenting inference with custom signals

There is **no documented API** to inject *"consultant scored 5 on LTO-X"* as a first-class confidence signal. The two routes available:

1. Push the outcome via Profile API or Org Data CSV - user must confirm; no level attached
2. Build a parallel Copilot Studio agent that reasons over People Skills + LTO scores at query time

---

## 4. Licensing and cost

### Headline licence

**Microsoft 365 Copilot, OR Microsoft Viva Suite, OR (with caveats) Microsoft 365 E3 / E5.**

People Skills has **no separate SKU**. Microsoft documentation:

> *"People Skills does not require a separate license - it is simply included in your Microsoft 365 Copilot and/or Viva* licenses. Each person in your company who has either an assigned Microsoft 365 Copilot or Viva license will be eligible for coverage by the People Skills inference engine."* (*Viva Communications and Communities does NOT count.*)

Late 2025 / early 2026 update: **AI inferencing extended to M365 E3 / E5 users** subject to conditions ([Microsoft Learn · Manage skills library](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-manage-skills-library)):

- Tenant must have at least one Copilot licence for the toggle to be available
- Only Microsoft 365 E3/E5 counts (not Office 365 E3/E5)
- E3/E5 user refresh = 180 days, vs. 30 days for Copilot/Viva
- All-or-nothing: enabling it for E3/E5 enables it for all E3/E5 users in tenant

### Per-seat vs per-tenant

- People Skills coverage is **per-seat** (one qualifying licence per inferred-about user)
- The custom skills library is **per-tenant** (one taxonomy serves the whole tenant)
- No separate per-tenant SKU

### Querying licence

A user who *queries* skills (e.g. a recruiter searching for expertise) needs at least an M365 base licence to use profile card surfaces. To use Copilot Chat queries against the skills index they need Copilot. The new **Workforce Insights agent** (which replaces the retired Skills Agent in March 2026) requires **a minimum of 50 paid Copilot licences in tenant** to enable.

### UK pricing (as of May 2026, list, ex VAT)

| SKU | UK price | Notes |
|---|---|---|
| Microsoft 365 Copilot Enterprise add-on | **£24.70/user/month** (£296.40/year) | Annual billing, sits on top of M365 E3/E5 |
| Microsoft 365 E3 | ~£28.10/user/month | Base for Copilot in many cases |
| Microsoft 365 E5 | ~£48.10/user/month | E5 adds Purview, Defender, Power BI Pro |
| Viva Suite (Copilot alternative) | ~£10/user/month | Cheaper inferred-about coverage path |
| Graph Connectors | Free (Microsoft-built) | Quota applies |
| Copilot Studio | $200/pack/month for 25,000 Copilot Credits, or pay-as-you-go | Required for custom agent build |
| Dataverse (default) | 15 GB DB + 40 GB file included; £40/GB/month after | Trivial for skills data |

**Important UK timing.** Microsoft is restructuring Copilot from 15 April 2026; first-renewal pricing changes from 1 July 2026. **UK businesses renewing before 30 June 2026 can lock pricing for 36 months.** This is a procurement window worth flagging.

### Licensing matrix for NCC scenarios

Assumptions: Copilot add-on at UK list price £24.70/user/month (£296.40/year). Assumes Microsoft 365 E3 or E5 base already in place. Excludes VAT.

| Scenario | Population | Approach | Annual cost (Copilot add-on only) |
|---|---|---|---|
| **(a) Pilot · 50 users · 90 days** | 50 | Buy 50 × Copilot annual (minimum commit) | **£14,820/year** |
| **(b) Defined population · 620 consultants** | 620 | Copilot for 620 + E3/E5 toggle for 200 support | **£183,768/year** (Copilot only) |
| **(b-light) Hybrid pilot-shape** | 80 power users + 620 inferred-only | Copilot for 80 power users; E3/E5 toggle on for rest | **£23,712/year** (Copilot only) |
| **(c) Full coverage · ~1,800 colleagues** | 1,800 | Copilot for everyone | **£533,520/year** (Copilot only) |
| **(c-realistic) Hybrid full coverage** | 1,800 | Copilot for 200 power users + E3/E5 toggle on for 1,600 | **£59,280/year** (Copilot only) |

**The vault's "£1m/yr at full coverage" estimate is overstated.** Real numbers:

- £533k for full Copilot rollout to 1,800
- ~£60k for the hybrid pattern (E3/E5 toggle for inferred-about + Copilot for power users)

The "£1m" figure may be valid if it bundles E3 → E5 upgrade, Copilot Studio at scale, Viva Suite, and Workday integration - but for Copilot-add-on-only on 1,800 seats, £533k is the honest number.

### Additional costs to be aware of

| Item | Cost shape | When it applies |
|---|---|---|
| Copilot Studio agent | $200/pack/month per 25,000 Copilot Credits | Required if building Skills Intelligence agent reading external sources |
| Dataverse capacity | 15 GB free; +£40/GB/month | Trivial for skills data; could matter for project-history scale |
| Power Platform premium | Per-user / per-app licences for custom UIs | If building bespoke UIs outside Copilot/Teams |
| Workday integration | Standard Workday pricing | No extra Microsoft fee for Workday → M365 Org Data ingestion |
| Viva Insights advanced (Skills Landscape Report) | Included in Viva Suite or Copilot | Required for Power BI Skills Landscape Report |

### UK / EU data residency

- M365 Copilot is part of the EU Data Boundary - EU traffic stays in the EU; worldwide traffic can leave for LLM processing.
- **Microsoft Advanced Data Residency (ADR)** add-on commits in-country storage for 27 countries (UK included).
- **November 2025: Microsoft announced in-country data processing for 15 countries (UK included)** for Copilot sovereignty. Reference: [Microsoft 365 Blog · sovereign controls](https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/04/microsoft-offers-in-country-data-processing-to-15-countries-to-strengthen-sovereign-controls-for-microsoft-365-copilot/).
- For NCC's customer-confidential workloads, the practical answer: in-region storage is fine, but explicit opt-in to ADR (typically ~10-15% uplift) may be commercially required for some customer contracts.

---

## 5. Maturity gaps and limitations

### Analyst commentary

**Everest Group, May 2025** ([blog](https://www.everestgrp.com/blog/microsofts-people-skills-and-skills-agent-a-step-forward-but-not-yet-complete-blog.html)). Key flags:

- *"Limited integration with external HR and business systems… current offering primarily infers skills from Microsoft 365 data"* (confirmed gap for Kantata/Limb/Spark)
- *"Incomplete skills and proficiency mapping… does not measure skill proficiency levels effectively"* (confirmed gap for LTO rubric)
- *"Validation and accuracy concerns… relies on employee self-review"* (confirmed gap)
- *"Taxonomy fragmentation"* risk where multiple skill taxonomies have to be reconciled

**Josh Bersin, April 2025** ([blog](https://joshbersin.com/2025/04/microsoft-launches-people-skills-in-copilot-altering-the-hr-tech-market/)). Net view: long-term contender, near-term complementary.

> *"It obsoletes the need for some of these other systems. While many of the incumbent vendors are well down the learning curve, Microsoft has the benefit of using its AI inference across hundreds of millions to billions of users. So if Microsoft invests in this toolset it could become one of the most definitive sources of skills data."*

**Josh Bersin, April 2026** ([blog](https://joshbersin.com/2026/04/the-reinvention-of-workday-from-system-of-record-to-platform-of-agents/)). Workday is repositioning as the "platform of agents" and explicitly contests Microsoft for skills primacy. Deep Workday-Microsoft convergence on skills is unlikely.

### Customer case studies

**No published Microsoft case study for People Skills in professional services / consulting as of May 2026.** The named GA preview customers were:

- Lloyds Banking Group (UK financial services)
- Grundfos (Danish industrial)
- Microsoft itself (100,000+ employees in preview)

Consulting firms have not (publicly) bet on People Skills as the canonical skills layer. This is itself a signal.

### Known issues and constraints

- **Frontline / field workers** with low M365 time → inference quality limited (Microsoft documented)
- **Soft skills** → activity may not be a clear indication of skill application (Microsoft documented)
- **Heavily-classified work** where consultants can't put project details in M365 → People Skills will under-infer the skills exercised on that work. **This hits cyber consulting hard** - red-team and incident-response work often has minimal M365 footprint
- **Multilingual workforce** → English-only custom skills
- **New hires** with less than 90 days M365 activity → no useful inference

### Skills Agent retirement

The original Skills Agent (announced April 2025, GA September 2025 in Frontier) is being **removed from agent store on 16 March 2026 and retired end of March 2026**. Replacements: **Learning agent** and **Workforce Insights agent** (Workforce Insights requires at least 50 paid Copilot licences). **People Agent** also retired same window ([Topedia blog](https://blog-en.topedia.com/2026/03/microsoft-retires-skills-agent-and-people-agent-in-microsoft-365-copilot/)).

This is a moving target. Anything built today against the Skills Agent has already been deprecated.

---

## 6. The four architectural patterns assessed

### (a) Push LTO → Workday Skills Cloud → People Skills

- Workday as SoR. Sync LTO into Workday. Workday → M365 Org Data ingestion writes user skills into M365.
- **Pros**: Single canonical taxonomy in HR system of record; benefits Workday-native processes (succession, comp); aligns with Workday-Microsoft ASOR partnership.
- **Cons**: LTO is compliance-grade with rubric levels; Workday Skills Cloud supports proficiency, but the Org Data ingestion into M365 flattens to skill names only - **the rubric level is lost on the M365 side**. Doesn't solve Kantata/Limb/Spark inputs (those are not in Workday). Slow refresh cycle (CSV batch).
- **When this fits**: Skills management is essentially an HR/talent process and People Skills is a "search the directory" extension.

### (b) Custom Graph Connector → People Skills directly

- **Not available in the way one might hope.** Microsoft Graph Connectors feed Copilot retrieval and Microsoft Search - **not the People Skills inference engine**. This option is effectively closed.
- The closest path is People Connectors (Graph), which can populate skills as read-only profile attributes - but that's not a substitute for inference and doesn't carry confidence/level/evidence.
- **Conclusion: this option is not viable as a substrate.**

### (c) Copilot Studio agent + People Skills as one signal

- Build a custom Skills Intelligence agent in Copilot Studio (or Azure AI Foundry).
- Agent has tools/connectors for: Kantata (project history), Limb (with row-level security for customer data), Spark (training), Salesforce (CRM), LinkedIn (where licence allows), Pinpoint (ATS), Digital Briefcase, **and** People Skills via Graph Profile API.
- Agent reasons over all signals; produces evidence trail; applies LTO 5-level rubric in its own logic.
- **Pros**: Preserves LTO rubric and compliance grade; uses People Skills as a free augmentation; explicit evidence trail; works around all of People Skills' documented gaps.
- **Cons**: Build and maintain it; Copilot Studio credit costs scale with usage; governance overhead; Dataverse for any persistent state.
- **This is the architectural pattern Everest Group and Bersin implicitly recommend.** People Skills is a data layer; the Skills Intelligence capability lives above it.

### (d) Bespoke build, leave People Skills out entirely

- Dedicated Skills Intelligence platform (Eightfold, Gloat, TechWolf, Lightcast/Galileo, or NCC-bespoke) ingesting from Workday, Kantata, Limb, Spark, Salesforce, LinkedIn directly.
- Doesn't use People Skills at all.
- **Pros**: Best fit for LTO rubric; full proficiency story; validation workflows; evidence trails; audit grade.
- **Cons**: Larger build/buy cost; misses the in-flow-of-work Copilot/profile-card UX that People Skills provides for free.
- **Bersin's view**: this is what most large enterprises currently do; Microsoft is now competing here.

---

## Extensibility matrix

| Feature | Supported | Partial | Not supported |
|---|---|---|---|
| Custom skills (add) | Yes, up to 5,000 | | |
| Replace default taxonomy | Yes, effectively | | |
| Custom hierarchies (parent/child) | | | No |
| Custom prerequisites | | | No |
| Proficiency levels (e.g. LTO 5-level) | | | No (binary only) |
| Multilingual skill names (FR/DE/etc.) | | | No (en_US only) |
| Skill descriptions over 200 chars | | | No |
| Tag skill as AI-restricted | Yes, first-class | | |
| Inference from M365 Graph signals | Yes | | |
| Inference from Kantata / Limb / Spark / Salesforce | | | No |
| 30-day refresh (Copilot/Viva users) | Yes | | |
| 180-day refresh on E3/E5 (with caveats) | Yes | | |
| Confidence scores exposed | | | No |
| Per-skill evidence trail | | | No |
| Manager-approval / validation workflow | | | No |
| Inject external "scored" signals (LTO scores) as first-class | | Flat skill assignment via CSV only, no level | |
| Bidirectional Workday Skills Cloud sync | | Workday → M365 one-way only | No bidirectional |
| Export inferred skills | | | No (only confirmed) |
| Export confirmed skills via Graph API | Yes | | |
| Per-tenant taxonomy | Yes | | |
| User opt-out of inference | Yes | | |
| Admin scope inference to specific groups/users | Yes (2026 update) | | |
| EU Data Boundary | Yes | | |
| UK in-country data processing (via ADR) | Yes (with add-on) | | |

---

## What we still don't know

Microsoft documentation does not answer the following. These are open questions to escalate with Microsoft UK account team or Microsoft Consulting Services:

1. **What is the actual model identifier under the hood?** ("Latest OpenAI LLM" is not enough for an AI assurance review.)
2. **What is the documented accuracy / recall / fairness benchmark per skill?** Microsoft cites 80% user-confirmation as the only public metric.
3. **Can the inference engine be told to weight certain Graph signals more heavily** (e.g. weight Limb project metadata more once a connector indexes it)?
4. **Is there a roadmap for native proficiency levels?** No public commitment.
5. **Is there a roadmap for manager-approval / validation workflows?** No public commitment despite explicit customer requests.
6. **Can multilingual skill names be added (non-en_US)?** Currently a hard no; no public roadmap.
7. **Does the inference engine respect Purview sensitivity labels** (e.g. skip "Confidential - Customer Restricted" documents)?
8. **Can a Microsoft 365 Copilot Connector index influence inference, not just retrieval?** Documentation says no - but this is the question to confirm directly.
9. **EU AI Act classification of People Skills as of May 2026?** Likely "limited risk" but no public Microsoft statement.
10. **Exact pricing for the Skills Landscape Power BI Report standalone** without Viva Insights Suite.
11. **Audit and lineage story for compliance reviews.** Inferred skills disappear silently when activity drops below threshold or skills are AI-restricted post-hoc; no immutable audit log surfaced.

---

## Recommendations for NCC

The full set of recommendations from this research:

1. **Do not bet the LTO compliance use case on People Skills alone.** It lacks proficiency rubric, evidence trail, manager validation, and external-system signals. Use it as one input, not the substrate.
2. **Run a 90-day pilot for the lightweight use case** (~50 users, ~£15k commitment). Validates *"find an expert in cyber skill X"* inside M365 Copilot, unlocks the Workforce Insights agent (50-seat threshold), produces a confirm-rate data point against LTO ground truth.
3. **Build the Skills Intelligence capability as a Copilot Studio (or Foundry) agent** that consumes People Skills via Graph Profile API **plus** Kantata, Limb, Spark, Workday, Salesforce, LinkedIn via custom connectors. This preserves LTO rubric, produces evidence trails, and treats People Skills as a free augmentation rather than a constraint.
4. **For the wider colleague population, use the E3/E5 inferencing toggle** rather than buying Copilot for everyone. Cost falls from £533k/year to ~£60k/year for similar inferred-about coverage, accepting 180-day refresh.
5. **Push the LTO taxonomy in as custom skills via CSV import.** Well within the 5,000 cap. Ensure descriptions fit 200 chars. Tag sensitive skills as AI-restricted.
6. **Treat Workday as the canonical system of record for confirmed skills, not People Skills.** Given Workday-Microsoft partnership trajectory and the lack of bidirectional sync, anchor on Workday Skills Cloud with rubric levels intact, then propagate names to M365 via Org Data ingestion where useful.
7. **Lock M365 / Copilot pricing before 30 June 2026** to avoid the July 2026 UK pricing uplift, if any commitment is being made.
8. **Open three explicit questions with Microsoft UK account team**: (a) People Skills + EU AI Act classification, (b) roadmap for proficiency/validation/connector-fed inference, (c) UK ADR pricing for the NCC tenant.

---

## Implications for the backlog and the AR1 decision

This research lands directly on the AR1 four-option choice. Reframing the four options with this evidence:

| Option | Status after research |
|---|---|
| **(1) Copilot Skills Inference** | **Viable as a layer, not as substrate.** Use as augmentation. £15k pilot to validate. |
| **(2) Workday Skills** | **Lossy.** Workday → M365 flattens proficiency. Workable for HR/talent processes; insufficient for LTO compliance. |
| **(3) Datalake (custom inference on Group/Cyber Fabric)** | **Best fit for v1 source picks (LTO + Kantata + Skills & Experience).** Compatible with all data sources. Preserves LTO rubric. Aligns with Performance Insights strategic frame. |
| **(4) Bespoke build inference** | **Most flexible, most expensive.** Genuine SI platforms exist (Eightfold, Gloat, TechWolf). Not necessarily NCC-bespoke build - could be buy. |

**The architecturally sound answer is a hybrid of (3) and (1):** Datalake-resident custom inference with People Skills consumed via Graph Profile API as a secondary signal. This is the option to put to the AR1 working session.

### Backlog items that update with this research

- **AR1**: status remains pending, but the framing tightens. Recommendation: hybrid (3) + (1). Burtscher/architecture group ratifies or pulls apart.
- **AR3** (*Is the inference layer actually a layer?*): the answer becomes clearer. **Yes, it is a layer.** It sits on the lakehouse, consumes lakehouse-resident data + People Skills, and surfaces via Copilot Studio.
- **AR5** (Skills rubric and taxonomy choice): LTO 5-level rubric *cannot* live in People Skills natively. It lives in our own layer. People Skills holds the names only.
- **AR8** (MuleSoft scope): unchanged - still likely out of lighthouse scope.
- **DD2** (v1 source picks): unchanged - LTO + Kantata + Skills & Experience holds up under the architecture.
- **New RF item**: *"In-flow-of-work UX via Copilot profile cards"* - the free UX layer that comes with the architectural choice.

---

## Related vault notes

- [[Copilot People Skills - built-in inference capability]]
- [[Microsoft Copilot People Skills - capability overview]]
- [[Microsoft Copilot People Skills - analyst views and maturity gaps]]
- [[Microsoft Copilot stack pricing - full-stack economics]]
- [[Microsoft Search Graph Connectors - capability and limits]]
- [[AR1 architecture choice reframed as four options]]
- [[Decision - 2026-05-08 - Open question - Build vs Leverage Copilot People Skills]] *(pending decision this research informs)*
- [[Skills Intelligence - Technical choices and architecture decisions]]
- [[MOC - Solution design]]
- [[MOC - Lighthouse backlog]]

---

## Sources

### Microsoft official documentation

- [Overview of People Skills - Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-overview)
- [Set up People Skills - Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-setup)
- [Manage your skills library in People Skills - Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-manage-skills-library)
- [Manage custom skills - Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-manage-custom-skill)
- [Import or export People Skills - Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/people-skills-import-export-skills)
- [People Skills AI Inference engine - Microsoft Learn](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-ai-inferencing)
- [Manage AI-restricted skills - Microsoft Learn](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-manage-ai-restricted-skills)
- [Manage Privacy and Sharing controls in People Skills](https://learn.microsoft.com/en-us/copilot/microsoft-365/people-skills-sharing-inferencing-controls)
- [Microsoft 365 Copilot connectors for people data - Microsoft Graph](https://learn.microsoft.com/en-us/graph/peopleconnectors)
- [Connectors overview - Microsoft 365 Copilot connectors](https://learn.microsoft.com/en-us/microsoftsearch/connectors-overview)
- [Licensing and Cost Considerations for Copilot Extensibility Options](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/cost-considerations)
- [Copilot Studio licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing)
- [Import organizational data from Workday](https://learn.microsoft.com/en-us/viva/import-org-data-workday)
- [Data Residency for Microsoft 365 Copilot and Copilot Chat](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-service-copilot)
- [AI transparency in People Skills](https://support.microsoft.com/en-us/office/ai-transparency-in-people-skills-4fc9a94d-24cf-42c4-9f2f-e95ff95b263e)

### Microsoft announcements and blogs

- [Announcing People Skills general availability and new Skills agent · April 2025](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/announcing-people-skills-general-availability-and-new-skills-agent/4406364)
- [People Skills · Expanding skills intelligence to more users and surfaces · March 2026](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/people-skills-expanding-skills-intelligence-to-more-users-and-surfaces-across-mi/4497646)
- [Microsoft Ignite 2025 · Copilot and agents for the Frontier Firm](https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/18/microsoft-ignite-2025-copilot-and-agents-built-to-power-the-frontier-firm/)
- [Microsoft offers in-country data processing to 15 countries · November 2025](https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/04/microsoft-offers-in-country-data-processing-to-15-countries-to-strengthen-sovereign-controls-for-microsoft-365-copilot/)

### Pricing references

- [Microsoft 365 Copilot Plans and Pricing UK](https://www.microsoft.com/en-gb/microsoft-365-copilot/pricing)
- [Microsoft pricing UK guide · Wise](https://wise.com/gb/blog/microsoft-pricing)
- [Microsoft 365 price increase July 2026 · Cloudswitched](https://www.cloudswitched.com/news/microsoft-365-price-increase-july-2026-copilot-uk-guide)

### Workday integration

- [Workday and Microsoft to Deliver Unified AI Agent Experience · September 2025](https://newsroom.workday.com/2025-09-16-Workday-and-Microsoft-to-Deliver-Unified-AI-Agent-Experience-for-the-Enterprise)

### Analyst commentary

- [Everest Group · Microsoft's People Skills and Skills Agent · A Step Forward, but Not Yet Complete](https://www.everestgrp.com/blog/microsofts-people-skills-and-skills-agent-a-step-forward-but-not-yet-complete-blog.html)
- [Josh Bersin · Microsoft Launches People Skills In Copilot · April 2025](https://joshbersin.com/2025/04/microsoft-launches-people-skills-in-copilot-altering-the-hr-tech-market/)
- [Josh Bersin · The Reinvention of Workday · April 2026](https://joshbersin.com/2026/04/the-reinvention-of-workday-from-system-of-record-to-platform-of-agents/)
- [Storyals · Introducing People Skills in Microsoft 365](https://blog.storyals.com/introducing-people-skills-in-microsoft-365)
- [Topedia Blog · AI skill inferencing expands to M365 E3/E5 · January 2026](https://blog-en.topedia.com/2026/01/ai-skill-inferencing-in-people-skills-expands-to-microsoft-365-e3-e5-users/)
- [Topedia Blog · Microsoft retires Skills Agent and People Agent · March 2026](https://blog-en.topedia.com/2026/03/microsoft-retires-skills-agent-and-people-agent-in-microsoft-365-copilot/)

#lighthouse #architecture #research #high-impact
