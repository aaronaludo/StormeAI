# StormeAI Design Direction

StormeAI should feel like a calm, trustworthy clinic operations platform — modern SaaS, but softer and safer than a generic AI tool.

## Product personality

- Calm
- Professional
- Trustworthy
- Human-friendly
- Healthcare-aware
- Efficient, but not cold

StormeAI is a **chat-only AI receptionist for clinics**, so the UI should make clinics feel that the system is safe, controlled, and easy to supervise.

## Visual direction

## Brand feel

**Theme:** calm clinical intelligence

Use a clean healthcare SaaS look:

- light, breathable layouts
- soft blue/teal accents
- neutral backgrounds
- rounded cards
- clear status indicators
- minimal gradients
- strong readability

Avoid:

- overly futuristic AI visuals
- dark cyberpunk UI
- aggressive neon colors
- medical imagery that suggests diagnosis or treatment

## Suggested color palette

```txt
Primary: #2563EB   // clinical blue
Accent:  #14B8A6   // calm teal
Success: #16A34A
Warning: #F59E0B
Danger:  #DC2626
Ink:     #0F172A
Muted:   #64748B
Surface: #F8FAFC
Card:    #FFFFFF
Border:  #E2E8F0
```

## Typography

Recommended:

- Inter
- Geist
- Manrope

Style:

- clear headings
- readable body copy
- avoid tiny text in clinical workflows
- use medium weights for navigation and card titles

## Core screens to design in Figma

### 1. Marketing landing page

Purpose: explain StormeAI to clinic owners.

Sections:

- Hero: "A chat-only AI receptionist for clinics"
- Benefits: instant replies, appointment capture, fewer repetitive messages
- How it works
- Clinic use cases
- Safety: not diagnosis, not prescription
- Pricing/manual billing CTA

### 2. Clinic dashboard

Purpose: give clinic admins a quick operational view.

Widgets:

- conversations today
- appointment requests
- upcoming appointments
- unanswered questions
- handoff requests
- receptionist status

### 3. AI receptionist settings

Purpose: configure the receptionist.

Fields:

- receptionist name
- tone/personality
- language preference
- system prompt preview
- safety rules
- emergency/handoff behavior

### 4. Knowledge base

Purpose: manage RAG sources.

Features:

- FAQ list
- document upload placeholder
- service information
- knowledge gaps
- last updated status

### 5. Appointment system

Purpose: manage bookings.

Views:

- appointment list
- appointment detail
- status badges: requested, confirmed, rescheduled, canceled
- patient details
- provider/service assignment

### 6. Patient chat widget

Purpose: patient-facing website chat.

States:

- closed bubble
- greeting
- FAQ answer
- appointment collection
- human handoff
- emergency-safe response

### 7. Workflow builder

Purpose: visual workflow control.

React Flow nodes:

- Greeting
- Ask Question
- FAQ Lookup
- Book Appointment
- Send Email
- Notify Staff
- Trigger n8n
- Human Handoff
- End

## UX principles

1. **Always show control**
   - Clinic admins should know what the AI can and cannot do.

2. **Appointment-first, not diagnosis-first**
   - The UI should guide users toward booking or staff handoff, not medical advice.

3. **Make safety visible**
   - Emergency handling and no-diagnosis rules should be obvious in settings.

4. **Reduce receptionist workload**
   - Design around repetitive clinic admin tasks.

5. **Keep patient chat simple**
   - No complex menus. Chat should feel quick and helpful.

## Suggested Figma file structure

```txt
StormeAI Design System
├─ Cover
├─ Foundations
│  ├─ Colors
│  ├─ Typography
│  ├─ Spacing
│  └─ Icons
├─ Components
│  ├─ Buttons
│  ├─ Inputs
│  ├─ Cards
│  ├─ Badges
│  ├─ Tables
│  ├─ Chat bubbles
│  └─ Workflow nodes
├─ Marketing
│  └─ Landing Page
├─ Dashboard
├─ AI Receptionist Settings
├─ Knowledge Base
├─ Appointments
├─ Chat Widget
└─ Workflow Builder
```

## First design milestone

Create these 5 Figma frames first:

1. Landing page hero
2. Clinic dashboard overview
3. AI receptionist settings
4. Patient chat widget
5. Appointment booking chat flow

These frames are enough to guide the first frontend build.
