---
name: healthcare-domain
description: "**HEALTHCARE DOMAIN SKILL** — Global healthcare domain expertise for platform requirements evaluation, gap analysis, user experience assessment, regulatory compliance, and data compliance. USE FOR: evaluating platform feature completeness against global healthcare standards; identifying gaps in clinical workflows, EHR capabilities, telehealth, and patient engagement; healthcare UX heuristics and accessibility audits; regulatory compliance review (HIPAA, GDPR, HITECH, DISHA, NABH, ABDM/ABHA, WHO guidelines, FDA SaMD, CE/MDR, SOC 2); data compliance evaluation (PHI handling, consent lifecycle, data sovereignty, retention, audit trails, encryption, breach notification); generating compliance checklists and remediation plans. DO NOT USE FOR: Firestore CRUD patterns (use data-layer skill); Mantine UI styling (use frontend skill); AI/chat pipeline internals (use ai-sdk skill); analytics events and KPI dashboards (use business-analysis skill)."
---

# Healthcare Domain — Platform Evaluation, Compliance & Data Governance

## Purpose

This skill enables systematic evaluation of the CareAI platform against global healthcare standards. It covers five dimensions:

1. **Platform Requirements** — feature completeness against global digital health standards
2. **Gap Analysis** — structured methodology to identify missing capabilities
3. **User Experience** — healthcare-specific UX heuristics
4. **Regulatory Compliance** — multi-jurisdictional healthcare regulations
5. **Data Compliance** — PHI handling, consent, sovereignty, retention, audit

---

## Golden Rules

1. **Patient safety is non-negotiable** — every evaluation must prioritize clinical safety over convenience, performance, or feature breadth. AI-generated content (SOAP notes, prescriptions, diet plans) must always carry disclaimers and never replace professional judgment.
2. **Consent before data** — no health data is accessed, displayed, or shared without verified informed consent. CareAI implements `ConsentGate` (`src/ui/ai/components/consent-gate.tsx`) and `ConsentGuard` (`src/ui/ai/components/consent-guard.tsx`) as mandatory gates.
3. **Multi-jurisdiction by default** — evaluate against the strictest applicable regulation. If GDPR requires explicit consent and HIPAA requires a BAA, both must be satisfied.
4. **Audit everything** — every write to health data must leave an audit trail (timestamps, userId, action). Firestore documents use `createdAt`/`updatedAt` timestamps consistently.
5. **Data minimization** — collect only what is clinically necessary. DTOs strip internal fields before client exposure (e.g., `toPatientDto()` excludes raw Firestore types).
6. **Encrypt at rest and in transit** — TLS 1.3 for transit, AES-256 for rest (Firebase default). Verify no plaintext PHI in logs or error messages.
7. **Consent is revocable** — `WithdrawConsentUseCase` (`src/data/patients/use-cases/withdraw-consent.use-case.ts`) and the consent management page (`src/app/(portal)/consent/page.tsx`) must exist and function.
8. **Cross-user access requires consent verification** — doctor-patient data access validates `link.status === "accepted"` before returning any health records (see `src/app/api/doctor-patients/[patientId]/health-records/route.ts`).
9. **AI disclaimers are mandatory** — every AI-generated clinical artifact must state it is not a substitute for professional medical advice.
10. **Accessibility is a compliance requirement** — WCAG 2.1 AA is the minimum for healthcare applications serving diverse populations.

---

## 1. Platform Requirements Evaluation

### 1.1 Global Digital Health Maturity Model

Evaluate CareAI against the WHO Digital Health Maturity Model and ONC Health IT certification criteria:

| Capability Domain | Required Features | CareAI Implementation | Status |
|---|---|---|---|
| **Patient Identity** | Demographics, multi-profile (dependents), identity verification | `profiles/{userId}`, `patients/{userId}`, dependent profile support via `profileId = dependentId ?? userId` | ✅ |
| **Clinical Documentation** | SOAP notes, structured assessments, condition tracking | `src/data/soap-notes/`, `src/data/assessments/`, `src/data/conditions/` | ✅ |
| **Medication Management** | Medication list, prescriptions, drug info, interaction checks | `src/data/medications/`, `src/data/prescriptions/`, extraction from uploads | ✅ |
| **Lab & Diagnostics** | Lab report ingestion, biomarker tracking, trend analysis | `src/data/lab-reports/`, `src/data/blood-tests/`, biomarker status classification | ✅ |
| **Vital Signs** | BP, HR, SpO2, temp, glucose, BMI, respiratory rate | `src/data/vitals/`, clinical classifications (ACC/AHA 2017 BP, etc.) | ✅ |
| **Symptom Tracking** | Structured symptoms, severity, onset, triggers, state tracking | `src/data/symptom-observations/`, LLM-structured parsing | ✅ |
| **Diet & Nutrition** | Personalized diet plans, calorie tracking, allergen awareness | `src/data/diet-plans/`, nutrition service, food preferences | ✅ |
| **Telehealth** | Video calls, scheduling, recording, in-call consent, chat | `src/data/meet/`, AWS Chime integration, RTDB signaling | ✅ |
| **Patient Summary** | Comprehensive health snapshot, diagnoses, medications, vitals | `src/data/patient-summary/`, AI-generated living summaries | ✅ |
| **Referrals** | Specialist referrals, status tracking, follow-up | `src/data/referrals/`, specialist routing via gateway | ✅ |
| **Provider-Patient Link** | Consent-gated access, doctor-patient relationship management | `src/data/doctor-patients/`, in-call consent flow | ✅ |
| **Clinical Decision Support** | AI triage, risk stratification, evidence-based assessments | Multi-agent gateway (20+ specialist agents), risk levels, evidence service | ✅ |
| **Patient Engagement** | Health hub dashboard, education, self-service health records | `src/app/(portal)/user/health/`, file uploads, conditions/medications management | ✅ |
| **Interoperability** | FHIR, HL7, CDA export, API access | ⚠️ Gap — see §2 |
| **Clinical Coding** | ICD-10, SNOMED CT, LOINC, RxNorm | Partial — ICD-10 in conditions (`icd10` field), no SNOMED/LOINC/RxNorm | ⚠️ |
| **e-Prescribing** | Formulary, pharmacy integration, controlled substance tracking | ⚠️ Gap — prescriptions are extracted/generated but not transmitted | ⚠️ |
| **Population Health** | Aggregated de-identified analytics, cohort analysis | ⚠️ Gap — individual KPIs exist but no population-level views | ⚠️ |
| **Audit Logging** | Immutable access logs, who-accessed-what-when | Partial — `createdAt`/`updatedAt` on documents, no dedicated audit log collection | ⚠️ |

### 1.2 Feature Completeness Checklist

When evaluating a new feature or reviewing the platform:

```
□ Does the feature handle PHI? → Verify consent gate, encryption, access control
□ Does it generate clinical content? → Verify AI disclaimer, risk level classification
□ Does it cross user boundaries? → Verify consent link status check
□ Does it store data? → Verify Zod validation, stripUndefined, timestamps
□ Does it display health data? → Verify loading states, error boundaries, empty states
□ Does it support dependents? → Verify profileId threading (dependentId ?? userId)
□ Does it need offline access? → Evaluate PWA capability
□ Does it support multiple languages? → Evaluate i18n readiness
□ Is it accessible? → WCAG 2.1 AA check (contrast, screen reader, keyboard nav)
□ Does it export data? → Verify data portability (GDPR Art. 20)
```

---

## 2. Gap Analysis

### 2.1 Methodology

Use the **HISMM (Health Information System Maturity Model)** gap analysis framework:

1. **Inventory** — catalog all existing features and data domains
2. **Benchmark** — compare against target standards (WHO, ONC, jurisdiction-specific)
3. **Classify** — categorize gaps by severity and urgency
4. **Prioritize** — rank by patient safety impact → regulatory risk → user value
5. **Remediate** — create actionable implementation plans

### 2.2 Gap Classification

| Severity | Definition | Action Required | Example |
|---|---|---|---|
| 🔴 **Critical** | Patient safety risk or regulatory violation | Immediate remediation | Missing audit trail for PHI access |
| 🟠 **High** | Significant compliance gap or missing core feature | Next sprint | No FHIR export for data portability |
| 🟡 **Medium** | Feature gap impacting UX or partial compliance | Roadmap item | Incomplete i18n for non-English users |
| 🟢 **Low** | Nice-to-have improvement, no compliance risk | Backlog | Population health dashboards |

### 2.3 Identified Gaps (Current State)

#### 🔴 Critical Gaps

| Gap | Impact | Remediation |
|---|---|---|
| **No dedicated audit log collection** | Cannot prove who accessed what PHI and when; fails HIPAA §164.312(b) audit controls | Create `audit-logs` Firestore collection with immutable append-only writes: `{userId, action, resourceType, resourceId, timestamp, ip}` |
| **No BAA (Business Associate Agreement) tracking** | Required for HIPAA when sharing PHI with sub-processors (Google, AI providers) | Document BAA status for each sub-processor; add compliance dashboard for admins |

#### 🟠 High Gaps

| Gap | Impact | Remediation |
|---|---|---|
| **No FHIR R4 export** | Blocks data portability (GDPR Art. 20, ONC Cures Act); prevents integration with external EHR systems | Implement FHIR Patient, Condition, MedicationStatement, Observation, DiagnosticReport resource mappers |
| **No SNOMED CT / LOINC / RxNorm coding** | Limits interoperability; conditions use free-text names + optional ICD-10 only | Extend condition, lab biomarker, and medication models with SNOMED CT, LOINC, and RxNorm codes |
| **No structured consent audit trail** | Consent grant/revoke events not logged separately from the patient document | Create consent event log: `{userId, action: "grant"|"revoke", timestamp, ipAddress, consentVersion}` |
| **No data export / download** | GDPR Right to Portability (Art. 20) requires machine-readable export | Build `/api/data-export` endpoint returning JSON/FHIR bundle of all user health data |

#### 🟡 Medium Gaps

| Gap | Impact | Remediation |
|---|---|---|
| **No i18n / multi-language support** | Excludes non-English speaking patients; accessibility concern | Implement Next.js i18n with language detection; translate consent forms, disclaimers, UI |
| **No medication interaction checking** | Prescriptions generated without cross-referencing existing medications | Integrate drug interaction database (e.g., FDA NDC, DrugBank) |
| **No appointment scheduling** | Telehealth calls are ad-hoc; no structured scheduling workflow | Build scheduling domain: `src/data/appointments/` with calendar integration |
| **No emergency contact / escalation** | No automated escalation when risk level is "emergency" | Build emergency contact system with auto-notification on emergency risk |

#### 🟢 Low Gaps

| Gap | Impact | Remediation |
|---|---|---|
| **No population health analytics** | Cannot identify trends across patient cohorts | Build aggregated, de-identified analytics dashboard for providers |
| **No clinical pathway templates** | Each assessment is ad-hoc; no standardized care pathways | Create reusable assessment templates aligned with clinical guidelines |
| **No wearable device integration** | Vitals are manually entered; no Apple Health / Google Fit / Fitbit sync | Build health data import API with device SDK connectors |

---

## 3. User Experience Evaluation

### 3.1 Healthcare UX Heuristics

Evaluate every interface against these healthcare-specific heuristics (extended from Nielsen's 10):

| # | Heuristic | Healthcare Application | CareAI Check |
|---|---|---|---|
| H1 | **Clinical Safety Visibility** | Risk levels, warnings, disclaimers are always visible and prominent | SOAP notes display `riskLevel` badges; AI disclaimer in consent gate |
| H2 | **Error Prevention Over Recovery** | Prevent harmful actions (e.g., wrong medication dosage) before they happen | Zod validation at UseCase boundary; form validators |
| H3 | **Progressive Disclosure** | Show summary first, details on demand; don't overwhelm with clinical data | Health Hub shows KPI cards → drill into domain pages |
| H4 | **Cognitive Load Minimization** | Healthcare data is complex; reduce decision fatigue with clear hierarchy | Mantine Card sections, color-coded severity badges, ring progress |
| H5 | **Trust & Transparency** | Users must trust AI outputs; show sources, confidence, limitations | AI disclaimers, evidence confidence scores, "not a doctor" warnings |
| H6 | **Accessibility & Inclusivity** | Diverse patient populations; support for disabilities, age, literacy levels | Mantine a11y defaults, semantic HTML, keyboard navigation |
| H7 | **Data Ownership Awareness** | Users must know what data is collected, how it's used, and how to delete it | Consent gate, privacy page, settings → withdraw consent |
| H8 | **Clinical Workflow Efficiency** | Minimize clicks for common provider tasks (view records, write notes) | Doctor portal: patient list → health records in 2 clicks |
| H9 | **Emergency Clarity** | Emergency states must be unmissable and actionable | `riskLevel: "emergency"` → red badges, prominent warnings |
| H10 | **Continuity of Care** | Session context persists; returning users see their history | Chat sessions persist, patient summary is cumulative, vitals trend |

### 3.2 UX Evaluation Checklist

```
Patient-Facing UX:
□ Consent flow is clear, non-coercive, and explains data usage
□ Health data is presented in plain language (not medical jargon only)
□ Risk levels use color + text + icon (never color alone — colorblind safe)
□ Emergency warnings are prominent with clear action steps
□ Loading states use skeletons matching content layout
□ Empty states guide users toward next action
□ File uploads show progress, validate type/size, handle errors gracefully
□ Navigation to health records is ≤ 2 taps from home

Provider-Facing UX:
□ Patient list loads quickly with search/filter/sort
□ Health records view shows all domains in one scrollable page
□ Consent status is visible before accessing patient data
□ In-call consent request flow is intuitive and non-disruptive
□ SOAP notes and summaries are scannable (headings, bullets, badges)

Accessibility:
□ All interactive elements are keyboard-navigable
□ Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI)
□ Screen reader announces dynamic content changes (aria-live)
□ Form inputs have visible labels (not placeholder-only)
□ Touch targets are ≥ 44x44px on mobile
□ Focus indicators are visible and consistent
```

---

## 4. Regulatory Compliance

### 4.1 Applicable Regulations

| Regulation | Jurisdiction | Applicability to CareAI | Key Requirements |
|---|---|---|---|
| **HIPAA** (Health Insurance Portability and Accountability Act) | United States | PHI processing, AI-generated clinical content | Privacy Rule, Security Rule, Breach Notification Rule, BAAs with sub-processors |
| **HITECH Act** | United States | Electronic health records, breach notification | Extends HIPAA enforcement; mandatory breach notification for >500 records |
| **GDPR** (General Data Protection Regulation) | EU/EEA | Health data as Special Category data (Art. 9) | Explicit consent, data minimization, right to erasure, DPO appointment, DPIA |
| **DISHA** (Digital Information Security in Healthcare Act) | India | Digital health data in Indian healthcare | Data localization, health data protection, electronic health record standards |
| **ABDM / ABHA** (Ayushman Bharat Digital Mission) | India | National health ID, interoperability | ABHA number integration, Health Information Exchange, FHIR R4 compliance |
| **NABH** (National Accreditation Board for Hospitals) | India | Quality standards for healthcare IT | Information management standards, clinical audit, patient safety |
| **FDA SaMD** (Software as a Medical Device) | United States | AI clinical decision support may qualify as SaMD | Risk classification (I/II/III), pre-market submission if SaMD, post-market surveillance |
| **EU MDR / CE Marking** | EU | Medical device software classification | MDCG guidance on health software, clinical evaluation, CE conformity |
| **SOC 2 Type II** | Global | Cloud service security controls | Trust Service Criteria: security, availability, processing integrity, confidentiality, privacy |
| **ISO 27001 / ISO 27799** | Global | Information security / Health informatics security | ISMS, health-specific security controls, risk management |
| **WHO Digital Health Guidelines** | Global | Digital health interventions classification | Evidence-based recommendations for digital health implementations |

### 4.2 HIPAA Compliance Checklist

```
Administrative Safeguards (§164.308):
□ Security officer designated
□ Risk analysis conducted and documented
□ Workforce training on PHI handling
□ Access authorization procedures
□ Contingency plan (backup, disaster recovery, emergency mode)
□ BAAs executed with all business associates (Google Firebase, AI providers, Vercel)

Physical Safeguards (§164.310):
□ Facility access controls (N/A for cloud-native — defer to cloud provider)
□ Workstation security policies
□ Device and media controls

Technical Safeguards (§164.312):
□ Access control — unique user IDs (Firebase Auth UID) ✅
□ Audit controls — record PHI access events ⚠️ (partial — needs dedicated audit log)
□ Integrity controls — Zod validation, stripUndefined ✅
□ Transmission security — TLS 1.3 for all API routes ✅
□ Encryption — AES-256 at rest (Firebase default) ✅
□ Automatic logoff — session expiry and token rotation ✅

Breach Notification Rule (§164.400-414):
□ Breach detection and investigation procedure
□ Notification to affected individuals within 60 days
□ Notification to HHS (>500 records: immediate; <500: annual)
□ Media notification for breaches >500 in a state
```

### 4.3 GDPR Compliance Checklist

```
Lawful Basis (Art. 6 & 9):
□ Explicit consent for health data processing (Art. 9(2)(a)) ✅ (ConsentGate)
□ Consent is freely given, specific, informed, unambiguous ✅
□ Consent can be withdrawn at any time ✅ (WithdrawConsentUseCase)
□ Records of consent maintained ⚠️ (consentedAt timestamp exists; needs versioned log)

Data Subject Rights:
□ Right of access (Art. 15) — user can view all their data ✅ (Health Hub)
□ Right to rectification (Art. 16) — user can correct data ✅ (edit medication, vitals)
□ Right to erasure (Art. 17) — user can delete data ✅ (delete use cases per domain)
□ Right to restriction (Art. 18) — user can restrict processing ⚠️ (needs implementation)
□ Right to portability (Art. 20) — machine-readable export ⚠️ (needs data export API)
□ Right to object (Art. 21) — user can object to processing ⚠️ (needs implementation)

Data Protection by Design (Art. 25):
□ Data minimization — collect only what's necessary ✅
□ Purpose limitation — data used only for stated purpose ✅
□ Storage limitation — retention policy defined and enforced ⚠️ (policy in privacy page; auto-deletion not implemented)
□ Pseudonymization where possible ⚠️ (data is identified, not pseudonymized)

DPIA (Art. 35):
□ Data Protection Impact Assessment for AI health processing ⚠️ (needs documentation)
□ Consultation with DPA if high risk identified
```

### 4.4 India-Specific Compliance (DISHA / ABDM)

```
DISHA (Draft — anticipated enforcement):
□ Health data stored in India or with adequate protections ⚠️ (Firebase region config)
□ Digital health ID linkage ready ⚠️ (no ABHA integration)
□ Consent manager integration ⚠️ (local consent only, no national consent manager)
□ Health Information Exchange readiness ⚠️ (no HIE integration)

ABDM / ABHA:
□ ABHA number field in patient profile ⚠️ (needs addition to PatientDocument)
□ Health Information Provider (HIP) registration ⚠️ (not implemented)
□ Health Information User (HIU) flow ⚠️ (not implemented)
□ FHIR R4 resource generation for ABDM gateway ⚠️ (no FHIR layer)
```

### 4.5 SaMD (Software as a Medical Device) Classification

CareAI's AI features may qualify as SaMD under FDA/IMDRF frameworks:

| Feature | SaMD Category | Risk Class | Regulatory Path |
|---|---|---|---|
| AI Triage (risk level classification) | Inform clinical management | Class II (moderate risk) | 510(k) or De Novo |
| AI Assessment (condition detection) | Drive clinical management | Class II–III | 510(k) / PMA |
| Diet plan generation | Inform personal wellness | Class I (low risk) / Non-SaMD | Exempt or general wellness |
| Vital sign recording (no diagnosis) | Non-SaMD (data capture only) | N/A | Exempt |
| Lab report extraction (OCR + display) | Non-SaMD (data digitization) | N/A | Exempt |
| Prescription extraction (OCR) | Non-SaMD (data digitization) | N/A | Exempt |

**Key action**: Determine intended use carefully. If CareAI's AI agents are positioned as "informational only" (not diagnostic), SaMD classification may be avoided. The AI disclaimer in `ConsentGate` supports this positioning.

---

## 5. Data Compliance

### 5.1 PHI Data Map

Map all PHI (Protected Health Information) elements in the system:

| PHI Element | Firestore Location | Access Pattern | Encryption |
|---|---|---|---|
| Patient demographics | `profiles/{userId}`, `patients/{userId}` | Direct user access; doctor via consent | At rest (AES-256) + transit (TLS 1.3) |
| Health conditions | `profiles/{profileId}/conditions/` | User; doctor via consent | At rest + transit |
| Medications | `profiles/{profileId}/medications/` | User; doctor via consent | At rest + transit |
| Vital signs | `profiles/{profileId}/vitals/` | User; doctor via consent | At rest + transit |
| SOAP notes | `profiles/{profileId}/soap-notes/` | User; system (AI-generated) | At rest + transit |
| Prescriptions | `profiles/{profileId}/prescriptions/` | User; extracted from uploads | At rest + transit |
| Lab reports | `profiles/{profileId}/lab-reports/` | User; extracted from uploads | At rest + transit |
| Assessments | `profiles/{profileId}/assessments/` | User; AI-generated Q&A | At rest + transit |
| Symptom observations | `profiles/{profileId}/symptom-observations/` | User; AI-parsed from chat | At rest + transit |
| Diet plans | `profiles/{profileId}/diet-plans/` | User; AI-generated | At rest + transit |
| Patient summaries | `profiles/{profileId}/patient-summaries/` | User; AI-generated | At rest + transit |
| Chat messages | `sessions/{sessionId}/messages/` | User; AI system | At rest + transit |
| Call recordings | Firebase Storage / S3 | Doctor-patient (consent required) | At rest + transit |
| Encounter records | `profiles/{profileId}/encounters/` | System (KPI aggregation) | At rest + transit |

### 5.2 Consent Lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│  New User   │ ──→ │ ConsentGate  │ ──→ │ Accept Terms  │ ──→ │ Platform Access│
│  (no data)  │     │ (blocking UI)│     │ (consentedAt) │     │  (full access) │
└─────────────┘     └──────────────┘     └───────────────┘     └────────────────┘
                                                |
                                                ↓
                                    ┌──────────────────────┐
                                    │ Consent Persisted     │
                                    │ • localStorage (fast) │
                                    │ • Firestore (durable) │
                                    └──────────────────────┘
                                                |
                          ┌─────────────────────┼─────────────────────┐
                          ↓                     ↓                     ↓
                  ┌───────────────┐    ┌────────────────┐    ┌───────────────────┐
                  │ Review Consent│    │ Withdraw Consent│    │ Doctor Requests   │
                  │ (/consent)    │    │ (sign out +     │    │ Patient Health    │
                  │               │    │  clear storage) │    │ Records (in-call) │
                  └───────────────┘    └────────────────┘    └───────────────────┘
```

**Key files**:
- Consent gate UI: `src/ui/ai/components/consent-gate.tsx`
- Consent guard wrapper: `src/ui/ai/components/consent-guard.tsx`
- Consent management page: `src/app/(portal)/consent/page.tsx`
- Withdraw consent use case: `src/data/patients/use-cases/withdraw-consent.use-case.ts`
- In-call consent banner: `src/app/(portal)/meet/[requestId]/_consent-banner.tsx`
- Doctor health records access: `src/app/api/doctor-patients/[patientId]/health-records/route.ts`
- Privacy policy: `src/app/(landing)/privacy/page.tsx`

### 5.3 Data Retention Policy

| Data Category | Current Retention | Recommended | Regulation |
|---|---|---|---|
| Account & health data | Active account + 30 days after deletion | Active + 30 days (compliant) | GDPR Art. 5(1)(e) |
| Assessment history | Indefinite (user-deletable) | 7 years (medical records standard) or user-deletable | HIPAA §164.530(j) |
| Chat sessions | Indefinite | 3 years or user-deletable | Align with assessment retention |
| Uploaded files | Until user deletes or closes account | Same as account lifecycle | GDPR Art. 5(1)(e) |
| Call recordings | Indefinite | 90 days unless explicitly retained | Storage cost + privacy |
| Aggregated analytics | Indefinite (anonymized) | Indefinite (compliant — no PII) | GDPR Recital 26 |
| Audit logs | N/A (not yet implemented) | 6 years minimum | HIPAA §164.530(j), SOC 2 |

### 5.4 Data Compliance Checklist

```
Encryption:
□ TLS 1.3 for all API routes and client connections ✅
□ AES-256 at rest for Firestore and Firebase Storage ✅ (Firebase default)
□ No plaintext PHI in server logs ✅ (verify: grep for console.log with health data)
□ No PHI in error messages returned to client ✅ (ApiError pattern strips details)
□ No PHI in URL parameters or query strings (use POST body for health data)
□ Encryption keys managed by cloud provider (Google KMS) ✅

Access Control:
□ Authentication required for all API routes ✅ (WithContext middleware)
□ userId derived from session token, never from request body ✅
□ Role-based access (patient vs. doctor vs. admin) ✅ (profile.kind check)
□ Cross-user access validates consent link ✅ (doctor-patient health records)
□ API rate limiting ⚠️ (needs implementation or Vercel edge config)
□ Credit/usage gating prevents resource exhaustion ✅

Data Sovereignty:
□ Firebase/Firestore region documented and configurable ⚠️
□ AI provider data processing regions documented ⚠️
□ Data residency requirements met for target jurisdictions ⚠️
□ Standard Contractual Clauses (SCCs) for cross-border transfers (mentioned in privacy policy) ✅

Breach Response:
□ Breach detection mechanism ⚠️ (needs implementation)
□ Incident response plan documented ⚠️
□ User notification template prepared ⚠️
□ Regulatory notification procedure (per jurisdiction) ⚠️
□ Breach log maintained ⚠️

Data Subject Requests:
□ Access request workflow (export all user data) ⚠️ (needs data export API)
□ Deletion request workflow (delete account + all data) ✅ (account deletion exists)
□ Correction request workflow (edit health records) ✅ (edit endpoints exist)
□ Request tracking and response within 30 days ⚠️ (no tracking system)
```

---

## 6. Evaluation Templates

### 6.1 Platform Evaluation Report Template

When asked to evaluate the platform, produce a report with this structure:

```markdown
# CareAI Platform Evaluation Report
**Date**: YYYY-MM-DD
**Evaluator**: [Agent/Person]
**Scope**: [Full platform / Specific domain]

## Executive Summary
[2-3 sentence overview of findings]

## Scoring (1-5 scale)
| Dimension | Score | Notes |
|---|---|---|
| Feature Completeness | X/5 | |
| Regulatory Compliance | X/5 | |
| Data Compliance | X/5 | |
| User Experience | X/5 | |
| Interoperability | X/5 | |
| **Overall** | **X/5** | |

## Critical Findings (must fix)
1. [Finding + remediation]

## High-Priority Gaps
1. [Gap + recommendation]

## Strengths
1. [Strength + evidence]

## Recommendations (prioritized)
1. [Action + effort estimate + impact]
```

### 6.2 Compliance Audit Template

```markdown
# Compliance Audit: [Regulation Name]
**Date**: YYYY-MM-DD
**Regulation**: HIPAA / GDPR / DISHA / FDA SaMD
**Scope**: [Specific sections audited]

## Compliance Status
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| [Requirement text] | ✅ / ⚠️ / ❌ | [File/feature reference] | [If non-compliant] |

## Non-Compliance Items
1. **[Requirement]**: [Current state] → [Required state] → [Remediation plan]

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [Risk description] | High/Med/Low | High/Med/Low | [Mitigation plan] |
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/ui/ai/components/consent-gate.tsx` | Informed consent gate — blocks platform access until accepted |
| `src/ui/ai/components/consent-guard.tsx` | Wrapper that checks consent status before rendering children |
| `src/app/(portal)/consent/page.tsx` | Consent review and withdraw page |
| `src/data/patients/use-cases/withdraw-consent.use-case.ts` | Withdraw consent use case |
| `src/app/(landing)/privacy/page.tsx` | Privacy policy page (data collection, retention, rights) |
| `src/app/api/doctor-patients/[patientId]/health-records/route.ts` | Consent-gated health records access |
| `src/app/(portal)/meet/[requestId]/_consent-banner.tsx` | In-call consent request banner |
| `src/app/(portal)/meet/[requestId]/_room.tsx` | Telehealth room with consent signaling |
| `src/data/patients/models/patient.model.ts` | Patient data model (includes consentedAt) |
| `src/data/soap-notes/models/soap-note.model.ts` | SOAP note model (riskLevel classification) |
| `src/data/conditions/models/condition.model.ts` | Condition model (ICD-10, severity, status) |
| `src/data/vitals/models/vital.model.ts` | Vital signs model (clinical classifications) |
| `src/data/encounters/models/encounter.model.ts` | Clinical encounter model (outcomes, KPIs) |
| `src/data/usage/models/usage.model.ts` | Usage/credits model (resource gating) |
| `src/ui/ai/types/agent-labels.ts` | Agent type labels (20+ clinical specialties) |
| `src/app/(portal)/profile/_sections/settings.tsx` | Privacy & consent settings in profile |
| `src/lib/api/with-context.ts` | API middleware — auth, role, context injection |
| `database.rules.json` | Firebase RTDB security rules (consent signaling) |
| `firestore.rules` | Firestore security rules |
