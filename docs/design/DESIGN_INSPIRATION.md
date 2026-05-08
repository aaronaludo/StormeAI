# StormeAI Design Inspiration Board

Research date: 2026-05-08

## Goal

Find design inspiration for StormeAI: a modern, user-friendly, configuration-heavy, chat-only AI receptionist SaaS for clinics.

StormeAI should combine three product styles:

1. Healthcare/clinic trust
2. Modern AI SaaS dashboard clarity
3. Appointment/chat workflow usability

---

## Inspiration Sources

## 1. Healthcare UI design best practices

Source: Eleken — Healthcare UI Design 2026

Link: https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications

Useful takeaways for StormeAI:

- Healthcare users are not just one user type. StormeAI has clinic owners, receptionists, staff/doctors, and patients.
- Interfaces should reduce cognitive load because healthcare/admin workflows can be stressful.
- Trust matters more than flashy visuals.
- Role-specific views are important: clinic admin dashboard vs patient chat widget should feel different.
- Design should be clear, safe, and structured because healthcare-adjacent software has higher risk.

Apply to StormeAI:

- Use calm colors, readable layouts, and clear status labels.
- Keep safety controls visible.
- Separate patient-facing chat from clinic admin configuration.
- Avoid visuals that make the AI look like a doctor.

---

## 2. AI dashboard design patterns

Source: Eleken — AI Dashboard Design

Link: https://www.eleken.co/blog-posts/ai-dashboard-design

Useful takeaways for StormeAI:

- AI dashboards fail when they show too much data without guiding action.
- Dashboards should help users decide what to do next, not just show charts.
- Visual hierarchy is important: surface urgent handoffs, appointment requests, and knowledge gaps first.
- AI insights should be explainable and actionable.

Apply to StormeAI:

- Dashboard should show "Next best action" cards.
- Use compact metrics but avoid clutter.
- Make knowledge gaps and handoff requests prominent.
- Show AI health/status: online, model route, safety mode, response latency.

---

## 3. Clinic website/user experience examples

Source: Subframe — 25 Clinic Website Design Examples

Link: https://www.subframe.com/tips/clinic-website-design-examples

Useful takeaways for StormeAI:

- Clinic websites should help patients quickly find services, hours, and appointment booking.
- Calming color palettes and clean navigation improve patient trust.
- Appointment booking should be easy and visible.
- Patient-facing experiences need responsive/mobile-friendly design.

Apply to StormeAI:

- Patient chat widget should be simple, friendly, and mobile-first.
- Chat should offer service choices and appointment options quickly.
- Use soft clinical colors instead of heavy enterprise dashboards.
- Keep emergency/safety messaging clear and visible.

---

## 4. Medical dashboard references

Source: Dribbble — Medical Dashboard tag

Link: https://dribbble.com/tags/medical-dashboard

Useful takeaways for StormeAI:

- Medical dashboards often use card-based KPI layouts.
- Clean white surfaces, soft blues/greens, and rounded cards are common.
- Status badges help users quickly understand patient/appointment states.

Apply to StormeAI:

- Use cards for conversations, appointments, handoffs, and knowledge gaps.
- Use badges: Online, Requested, Confirmed, Needs Review, Emergency, Handoff.
- Keep the admin dashboard airy and readable.

---

## 5. AI chatbot dashboard references

Source: Dribbble — AI Chatbot / AI Dashboard tags

Links:

- https://dribbble.com/tags/ai-chatbot
- https://dribbble.com/tags/ai-dashboard

Useful takeaways for StormeAI:

- Chatbot dashboards often show conversation previews, model status, prompt configuration, and analytics.
- Modern AI SaaS products use rounded panels, model/provider cards, and workflow views.

Apply to StormeAI:

- Create an AI Receptionist Command Center.
- Show current model: Ollama qwen2.5:7b, Claude/OpenAI fallback.
- Give clinics simple controls for tone, language, prompt, RAG sources, and handoff rules.

---

## 6. Appointment scheduling design references

Source: Dribbble — Appointment Scheduling tag

Link: https://dribbble.com/tags/appointment-scheduling

Useful takeaways for StormeAI:

- Scheduling UI should make status and next actions obvious.
- Appointment cards/lists should show patient, service, provider, time, and action.
- Filters by status are important.

Apply to StormeAI:

- Appointment Inbox should include tabs: Requested, Confirmed, Rescheduled, Canceled.
- Each appointment row should have clear action buttons: Confirm, Review, Reschedule, Cancel.
- Chat booking flow should collect only the minimum needed information.

---

## Recommended StormeAI visual direction

## Style

Modern clinic SaaS.

Not too medical, not too futuristic.

## Colors

```txt
Primary blue: #2563EB
Clinical teal: #14B8A6
Success: #16A34A
Warning: #F59E0B
Emergency: #DC2626
Ink: #0B1220
Muted: #64748B
Background: #F6F8FC
Cards: #FFFFFF
Borders: #E2E8F0
```

## Layout pattern

- Persistent left sidebar for clinic admin
- Top status bar for clinic/workspace state
- Card-based dashboard metrics
- Large configuration panels
- Clear toggle switches and sliders
- Soft status badges
- Patient chat preview cards
- Workflow canvas with friendly nodes

## Key UI modules to emphasize

1. **AI Receptionist Command Center**
   - online/offline status
   - current model route
   - safety mode
   - checklist of setup tasks

2. **Personality & Prompt Builder**
   - receptionist name
   - tone
   - language
   - prompt preview
   - safety toggles

3. **Provider Routing**
   - Ollama default
   - OpenAI optional
   - Claude optional
   - fallback rules

4. **Knowledge Base / RAG**
   - indexed sources
   - needs review
   - knowledge gaps
   - approved-only answer mode

5. **Appointment Inbox**
   - status tabs
   - appointment cards
   - quick actions

6. **Patient Chat Widget**
   - greeting state
   - FAQ state
   - booking state
   - emergency state
   - handoff state

7. **Safety & Escalation**
   - no diagnosis
   - no prescription
   - emergency guidance
   - staff handoff
   - audit log

---

## Design conclusion

StormeAI should feel like:

> Linear / Intercom-level SaaS polish + clinic dashboard trust + chatbot configuration control.

The best design direction is a **calm, white-card SaaS interface with blue/teal accents**, not a dark AI dashboard.

This supports clinic trust, patient friendliness, and configuration-heavy workflows without making the product feel intimidating.
