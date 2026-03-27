# Patient Portal Course of Action

## Why this plan exists

Today, the patient portal is more capable than it feels.

A patient can already use CareAI to:

- chat with the assistant about symptoms and health questions
- complete structured assessments
- manage medications and prescriptions
- log vitals
- upload files and lab reports
- review referrals
- revisit history and summaries
- benefit from long-term memory and continuity

But the product still risks being perceived as "just another AI chat app" because patients are not clearly shown:

- what they can do in the portal
- why they should use this instead of ChatGPT or Gemini
- what value they get after the first conversation
- how the portal connects AI guidance with real healthcare workflows

This plan focuses on closing that gap over the next 1–2 quarters.

## The core problem

The main issue is not a lack of capability. It is a lack of visible meaning.

The patient experience currently under-communicates three important truths:

1. **CareAI is structured, not generic**  
   It produces assessments, prescriptions, lab interpretations, summaries, referrals, and other structured outputs rather than only free-form chat.

2. **CareAI is longitudinal, not stateless**  
   It stores history, remembers patient-relevant facts, and can build continuity across sessions.

3. **CareAI is care-workflow oriented, not just answer oriented**  
   It can connect guidance to prescriptions, referrals, summaries, labs, vitals, and doctor-facing workflows.

Because these truths are not obvious in the product, patients can easily compare the experience to a faster general-purpose AI and conclude that generic AI is "better" before they discover the actual strengths of the portal.

## What should make CareAI better than generic AI

For patient users, CareAI should win on the following dimensions.

### Clinical guidance

CareAI should feel more clinically grounded than generic AI by emphasizing:

- structured assessments
- risk levels
- guideline-informed reasoning
- patient summaries and action plans
- medication, prescription, and lab workflows

### Continuity of care

CareAI should feel like a persistent health workspace, not a disposable chat.

That means patients should clearly understand that the portal helps them:

- build a usable health history
- revisit prior assessments and recommendations
- keep track of medications, vitals, labs, and referrals
- carry context across future interactions

### Actionability

The product should produce outputs that patients can actually use:

- what to do next
- what to watch out for
- what can be saved
- what can be shared with a clinician
- when to escalate to a real doctor

## Why patients may still choose ChatGPT or Gemini today

Patients may prefer generic AI today for reasons that are understandable:

- it feels faster
- it feels simpler
- the value is instantly obvious
- there is less apparent friction before getting an answer

CareAI currently loses this first-impression moment because:

- patients land directly in chat without a clear portal overview
- the assistant does not strongly explain what makes the experience different
- key value surfaces are buried in navigation
- some high-value routes are not even visible in navigation
- trust and usage messaging are not fully aligned with implementation

## Strategic objective

Over the next 1–2 quarters, reposition the patient portal from **"AI symptom chat"** to **"your clinically guided health workspace"**.

The product should answer these three questions within the first minute of use:

1. What can I do here?
2. Why is this better than generic AI for my health?
3. What should I do next?

## Phase 1 — Reset the patient narrative and trust story

### Goal

Make the product easier to understand before adding major new functionality.

### Actions

1. **Clarify the patient value proposition across the product**
   - Align landing page, assistant empty state, FAQ, and patient page introductions.
   - Standardize the product message around:
     - clinical guidance
     - continuity of care
     - actionable next steps

2. **Explicitly explain why CareAI is different from generic AI**
   - Add patient-facing comparisons in product copy and onboarding.
   - Emphasize:
     - use of patient context and prior records
     - structured outputs instead of only free-form responses
     - referrals, prescriptions, and summaries
     - trust and safety guardrails
     - doctor-connected workflows where applicable

3. **Fix trust-eroding copy inconsistencies**
   - Update FAQ and related usage copy so it matches the actual usage model.
   - Review privacy, safety, disclaimer, and doctor-related wording for consistency with implemented behavior.

4. **Make guideline-based care more visible**
   - Patients should understand that recommendations are not arbitrary.
   - Where appropriate, show that the assistant follows evidence-based clinical logic.

### Expected result

Patients should leave the first session understanding that CareAI is a healthcare workflow product, not just a chatbot.

## Phase 2 — Make existing value visible inside the portal

### Goal

Surface high-value existing features instead of hiding them behind exploration.

### Actions

1. **Create a real patient home/dashboard experience**
   - Replace or augment the current direct redirect into the assistant.
   - The patient home should answer: "What can I do here today?"
   - Include quick-entry modules for:
     - assistant
     - vitals
     - assessments
     - prescriptions
     - lab reports
     - referrals
     - history

2. **Add first-run onboarding inside the portal**
   - After sign-in, show a short guided experience that explains:
     - what CareAI can do
     - when to use it
     - how saved data improves future care
     - how to move from chat to records and follow-up actions

3. **Improve navigation information architecture**
   - Reorder or relabel items to prioritize the most meaningful patient jobs.
   - Evaluate whether to expose currently hidden but already implemented flows such as:
     - doctors
     - connect / consult
   - Avoid hiding major differentiators if they are production-ready.

4. **Upgrade empty states and intro copy across patient pages**
   - High-value pages should not feel like storage bins.
   - Each page should explain:
     - why it matters
     - what gets saved there
     - what action the patient should take next

### Expected result

Patients should be able to discover major portal value without guessing or clicking around randomly.

## Phase 3 — Create reasons to return

### Goal

Turn the portal into something worth revisiting after the first chat.

### Actions

1. **Add a session-end care recap**
   - At the end of a meaningful interaction, summarize:
     - what the patient shared
     - what CareAI found
     - what the next steps are
     - what can be saved or reviewed later

2. **Make continuity visible**
   - Show patients when important facts are saved and reused.
   - Make history and memory feel like a benefit, not a hidden system behavior.

3. **Connect chat outcomes to patient records**
   - Reinforce pathways from conversations into:
     - assessments
     - patient summaries
     - prescriptions
     - lab reports
     - referrals

4. **Add export/share value**
   - Let patients take useful outputs outside the product.
   - Prioritize export/share for:
     - patient summaries
     - assessments
     - prescriptions
     - referrals

### Expected result

Patients should feel that every session builds something useful over time.

## Phase 4 — Reduce friction versus generic AI

### Goal

Compete better with the speed and simplicity of general-purpose AI without losing clinical depth.

### Actions

1. **Introduce two usage modes**
   - Quick guidance
   - Full assessment

   This gives patients a lower-friction option when they want speed, while preserving a structured path for more serious health workflows.

2. **Improve expectation-setting around speed**
   - If CareAI is taking longer because it is checking records, guidelines, or specialist logic, say so.
   - Perceived slowness hurts less when the user understands the reason.

3. **Make trust and review cues more visible**
   - Where outputs involve approval, review, or escalation, reflect that clearly in the UI.

### Expected result

Patients should feel that CareAI is slower only when it is doing meaningfully more valuable work.

## Phase 5 — Measure whether clarity and trust actually improve

### Goal

Treat this as a product understanding problem that must be measured, not guessed.

### Success measures

Track whether the portal becomes easier to understand and more valuable to use.

Recommended metrics:

- activation to first meaningful action
- repeat 7-day usage
- assessment completion rate
- usage of non-chat features
- patient-summary views/saves
- referral discovery and acceptance
- doctor/connect feature discovery
- reduction in FAQ confusion and support requests

### Instrumentation priorities

Add or refine analytics around:

- onboarding completion
- dashboard CTA usage
- feature discovery
- recap saves
- export actions
- trust/explainability interactions

### GA4 measurement spec for trust explainers

Use the existing typed analytics event `health_record_viewed` with explicit `action` and `surface` params to avoid event-sprawl while still enabling funnel analysis.

#### Event mapping (implemented)

- `event_name`: `health_record_viewed`
  - `action`: `open_linked_session`
  - `surface` (examples):
    - `patient_summary`
    - `prescription_detail`
    - `lab_report_detail`
    - `referral_row`
  - additional IDs where available:
    - `session_id`
    - `summary_id` / `prescription_id` / `report_id` / `referral_id`

- `event_name`: `health_record_viewed`
  - `action`: `open_history_session`
  - `surface`: history list row interaction
  - additional params:
    - `session_id`
    - `agent_type`

#### Recommended GA4 explorations

1. **Linked-session CTA usage by surface**
   - Filter: `event_name = health_record_viewed`
   - Filter: `action = open_linked_session`
   - Breakdown: `surface`
   - KPI: total events + unique users per surface

2. **History continuity usage**
   - Filter: `event_name = health_record_viewed`
   - Filter: `action = open_history_session`
   - Breakdown: `agent_type`
   - KPI: unique users reopening prior sessions

3. **Trust explainer → continuity proxy**
   - Compare pre/post release periods:
     - `open_linked_session` event volume
     - share of users with at least one linked-session open
   - Primary readout: whether trust-oriented pages drive more continuity actions

4. **Surface contribution trend**
   - Weekly trend by `surface` for `open_linked_session`
   - Goal: identify which pages teach continuity best and which need copy/UX iteration

#### Suggested guardrails

- Keep event names stable; prefer evolving params (`action`, `surface`) over adding many new event names.
- Ensure every new trust CTA emits either `open_linked_session` or `open_history_session` for consistent reporting.
- Review unknown/empty `surface` values weekly to catch instrumentation drift.

## Recommended implementation order

### Now

- create and align the product plan
- fix trust copy inconsistencies
- align patient-facing messaging across key surfaces

### Next

- add patient home/dashboard
- improve onboarding and navigation
- improve empty states and page intros

### Then

- add care recap, continuity cues, and export/share
- introduce quick guidance vs full assessment
- measure outcomes and iterate

## High-priority immediate opportunities

1. **Fix FAQ usage messaging**  
   This is a trust issue and should be corrected immediately.

2. **Stop hiding major value**  
   If doctor/connect flows are ready, they should not remain invisible.

3. **Add a patient home instead of a raw redirect to chat**  
   The patient should not have to infer the product from a blank starting point.

4. **Show why the portal exists beyond chat**  
   Every key page should connect to a broader care journey.

## Product principle going forward

The patient portal should not feel like a place where conversations disappear.

It should feel like a place where:

- assessments become history
- guidance becomes action
- symptoms become structured care artifacts
- one conversation becomes ongoing support

That is the real opportunity: not to beat ChatGPT at being a chatbot, but to beat it at being useful for healthcare.
