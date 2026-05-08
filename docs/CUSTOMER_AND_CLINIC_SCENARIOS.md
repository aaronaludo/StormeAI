# Customer and Clinic Scenarios

StormeAI is a chat-only AI receptionist for clinics. This document captures real-world scenarios from both sides of the conversation: the patient/customer and the clinic team.

## Core value

StormeAI helps clinics respond faster, reduce repetitive admin work, and convert more patient inquiries into booked appointments through chat.

It is not an AI doctor. It does not diagnose, prescribe, or replace medical professionals.

---

## Patient / Customer Scenarios

### 1. After-hours appointment inquiry

**Scenario:** A patient remembers at 10:30 PM that they need a dental cleaning and checks the clinic website.

**Patient asks:**
> Hi, are you open tomorrow? Can I book dental cleaning?

**StormeAI handles:**
- checks clinic hours
- confirms the service is offered
- asks preferred date/time
- collects name/contact details
- creates appointment request or confirmed booking
- sends confirmation email

**Customer benefit:** The patient does not need to wait until morning for a reply.

**Clinic benefit:** The clinic captures a booking that may have been lost to another clinic.

---

### 2. Common FAQ before booking

**Scenario:** A patient wants to know consultation fee, clinic location, and accepted payment methods before booking.

**Patient asks:**
> How much is consultation and where are you located?

**StormeAI handles:**
- retrieves fee/location/payment details from the clinic knowledge base
- answers clearly
- offers to book an appointment

**Customer benefit:** The patient gets instant, accurate information.

**Clinic benefit:** Staff no longer need to answer the same questions repeatedly.

---

### 3. Service discovery

**Scenario:** A patient is unsure whether the clinic provides a specific service.

**Patient asks:**
> Do you do acne scar treatment?

**StormeAI handles:**
- checks the clinic service list/RAG knowledge base
- explains available relevant services in non-diagnostic language
- recommends booking a consultation for medical advice
- offers available appointment options

**Customer benefit:** The patient quickly understands whether the clinic is relevant.

**Clinic benefit:** More qualified leads move toward consultation.

---

### 4. Rescheduling an appointment

**Scenario:** A patient cannot attend their appointment tomorrow.

**Patient asks:**
> I need to move my appointment to Friday.

**StormeAI handles:**
- verifies appointment details using safe identifiers
- checks available slots
- offers new times
- updates appointment status
- sends updated confirmation
- triggers n8n workflow for staff notification

**Customer benefit:** Rescheduling is convenient and fast.

**Clinic benefit:** Staff spend less time coordinating schedule changes.

---

### 5. Cancellation request

**Scenario:** A patient needs to cancel.

**Patient asks:**
> Please cancel my appointment today.

**StormeAI handles:**
- verifies appointment
- applies clinic cancellation policy
- cancels or marks for staff review
- sends confirmation
- optionally offers to reschedule

**Customer benefit:** The patient can cancel without calling.

**Clinic benefit:** The clinic gets earlier notice and can refill the slot.

---

### 6. Pre-visit preparation

**Scenario:** A patient wants to know what to bring before a lab test or consultation.

**Patient asks:**
> Do I need to fast before my blood test?

**StormeAI handles:**
- answers only from approved clinic instructions
- includes disclaimers where needed
- offers to confirm with staff if uncertain

**Customer benefit:** The patient arrives prepared.

**Clinic benefit:** Fewer wasted appointments due to missing preparation.

---

### 7. Urgent or emergency concern

**Scenario:** A patient sends a message suggesting a possible emergency.

**Patient asks:**
> I have chest pain and difficulty breathing. Can I book tomorrow?

**StormeAI handles:**
- does not diagnose
- does not continue normal booking flow first
- gives emergency guidance based on clinic policy
- tells the patient to contact emergency services or go to the nearest ER
- optionally alerts clinic staff

**Customer benefit:** The patient is not misled into waiting for a routine appointment.

**Clinic benefit:** The clinic reduces safety risk and follows responsible escalation rules.

---

### 8. Multilingual patient support

**Scenario:** A patient prefers Tagalog or Taglish.

**Patient asks:**
> Pwede po ba walk-in bukas? Magkano consultation?

**StormeAI handles:**
- responds in Tagalog/Taglish if enabled by the clinic
- explains walk-in policy and consultation fee
- offers booking

**Customer benefit:** The conversation feels more natural and accessible.

**Clinic benefit:** The clinic serves more patients without needing every staff member available in every language.

---

## Clinic Scenarios

### 1. Small dental clinic with overloaded front desk

**Problem:** Staff spend too much time replying to repeated questions about hours, cleaning prices, location, and availability.

**StormeAI solution:**
- answers FAQs 24/7
- guides patients to book cleaning, extraction, braces consultation, or checkup
- sends confirmation emails
- notifies staff through n8n

**Business benefit:**
- fewer repetitive chats
- faster response time
- more bookings from website traffic
- receptionist can focus on in-clinic patients

---

### 2. Dermatology/aesthetic clinic with high inquiry volume

**Problem:** Patients ask about procedures, price ranges, doctor availability, promos, and pre-consultation requirements.

**StormeAI solution:**
- answers from approved treatment/service knowledge base
- avoids diagnosis or treatment recommendation claims
- offers consultation booking
- captures lead details for staff follow-up

**Business benefit:**
- improves lead capture
- reduces missed inquiries from social/website traffic
- turns service curiosity into consultation bookings

---

### 3. Diagnostic or lab clinic with preparation rules

**Problem:** Patients frequently ask about fasting, required documents, schedules, and result release times.

**StormeAI solution:**
- retrieves test preparation instructions from RAG
- answers result timeline and branch availability questions
- books lab appointments or creates appointment requests

**Business benefit:**
- fewer invalid visits due to lack of preparation
- smoother patient flow
- reduced phone/chat burden

---

### 4. Therapy or wellness clinic managing recurring sessions

**Problem:** Patients need to ask about available slots, reschedule, and understand session types.

**StormeAI solution:**
- explains session types and general policies
- supports appointment requests and rescheduling
- sends reminders and follow-up emails through Resend/n8n

**Business benefit:**
- fewer no-shows
- easier schedule management
- better client experience

---

### 5. Multi-provider clinic

**Problem:** Different doctors/providers have different schedules, services, and appointment rules.

**StormeAI solution:**
- asks which service or provider the patient needs
- checks provider availability rules
- routes booking to the right provider
- escalates conflicts to staff

**Business benefit:**
- cleaner appointment routing
- fewer scheduling mistakes
- less manual coordination

---

### 6. Clinic owner wants visibility into demand

**Problem:** The owner does not know what patients ask most often or which services drive inquiries.

**StormeAI solution:**
- stores chat sessions and message metadata
- tracks common questions, booking intent, and conversion events
- shows analytics later in dashboard

**Business benefit:**
- better service/pricing decisions
- identifies missing FAQ content
- improves marketing and staffing decisions

---

### 7. Clinic needs automated staff handoff

**Problem:** Some questions need human review, but staff miss messages across channels.

**StormeAI solution:**
- detects low-confidence, sensitive, or out-of-scope questions
- triggers n8n webhook
- sends staff notification by email or internal dashboard
- includes conversation summary

**Business benefit:**
- faster human follow-up
- better continuity
- safer handling of complex requests

---

## Real Use Case Flows

### Flow A: FAQ to appointment conversion

```txt
Patient asks about service price
→ StormeAI answers from knowledge base
→ Patient asks for available schedule
→ StormeAI collects patient details
→ Appointment is created
→ Resend sends confirmation email
→ n8n notifies clinic staff
```

### Flow B: Unknown question with safe fallback

```txt
Patient asks a question not found in clinic knowledge
→ StormeAI says it cannot confirm that from clinic records
→ StormeAI offers to notify staff
→ n8n creates staff follow-up task
→ Patient receives expected response timeline
```

### Flow C: Emergency safety route

```txt
Patient describes emergency symptoms
→ StormeAI stops normal booking flow
→ StormeAI gives emergency instruction
→ StormeAI optionally alerts staff
→ Conversation is marked high priority
```

### Flow D: Appointment reminder automation

```txt
Appointment created
→ n8n waits until configured reminder time
→ Resend sends reminder email
→ Patient confirms/reschedules through chat
→ Appointment status updates in Supabase
```

### Flow E: Knowledge base improvement loop

```txt
Patients repeatedly ask same unanswered question
→ StormeAI marks it as knowledge gap
→ Clinic admin reviews question
→ Admin adds approved answer to knowledge base
→ Future patients get instant answer
```

---

## Benefits Summary

## For patients

- instant answers
- easier booking
- less waiting
- clearer preparation instructions
- multilingual support if enabled
- safer routing for urgent cases

## For clinics

- fewer repetitive messages
- more booked appointments
- better after-hours lead capture
- reduced no-shows through reminders
- safer escalation rules
- better staff productivity
- better visibility into patient demand

## For clinic owners

- scalable front desk support without hiring immediately
- stronger online patient experience
- measurable conversion from chat to appointment
- cleaner operations through n8n automation
- SaaS-ready setup with billing, workflows, and clinic-specific configuration
