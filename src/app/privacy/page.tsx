import {
  Anchor,
  Box,
  Container,
  Divider,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { LegalLayout } from "@/ui/layouts/legal";
import {
  IconHeartbeat,
  IconLock,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy Policy — CareAI",
  description: "How CareAI collects, uses, and protects your personal and health information.",
};

const LAST_UPDATED = "March 4, 2026";

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Stack gap="sm">
      <Title order={3} size="h4">{title}</Title>
      {children}
    </Stack>
  );
}

export default function PrivacyPage() {
  return (
    <LegalLayout>
      {/* Header */}
      <Box
        py={{ base: 60, sm: 80 }}
        style={{
          background:
            "light-dark(linear-gradient(135deg, var(--mantine-color-primary-0) 0%, var(--mantine-color-blue-0) 100%), linear-gradient(135deg, rgba(61,42,160,0.2) 0%, rgba(13,110,253,0.1) 100%))",
        }}
      >
        <Container size="md">
          <Stack align="center" gap="md">
            <ThemeIcon size={56} radius="xl" color="primary" variant="light">
              <IconLock size={28} />
            </ThemeIcon>
            <Title ta="center" style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)" }}>
              Privacy Policy
            </Title>
            <Text size="md" c="dimmed" ta="center" maw={540}>
              We take your health data seriously. This policy explains exactly what we collect,
              why we need it, and how we protect it.
            </Text>
            <Text size="xs" c="dimmed">Last updated: {LAST_UPDATED}</Text>
          </Stack>
        </Container>
      </Box>

      {/* Body */}
      <Container size="md" py={{ base: 48, sm: 72 }}>
        <Stack gap="xl">

          {/* 1 */}
          <Section title="1. Who We Are">
            <Text size="sm" c="dimmed" lh={1.8}>
              CareAI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is an AI-powered clinical assessment service provided
              by CosmoOps. We operate the platform available at{" "}
              <Anchor href="https://care.ai" size="sm">care.ai</Anchor> and all related
              subdomains and applications (collectively, the &quot;Service&quot;). For privacy
              enquiries, contact us at{" "}
              <Anchor href="mailto:privacy@care.ai" size="sm">privacy@care.ai</Anchor>.
            </Text>
          </Section>

          <Divider />

          {/* 2 */}
          <Section title="2. Information We Collect">
            <Text size="sm" c="dimmed" lh={1.8}>
              We collect information you provide directly, information generated through your
              use of the Service, and limited information from third-party providers:
            </Text>
            <Stack gap="xs">
              <Text size="sm" fw={600}>2.1 Account Information</Text>
              <List size="sm" c="dimmed" spacing="xs" withPadding>
                <List.Item>Email address (used for passwordless magic-link authentication)</List.Item>
                <List.Item>Display name and profile details you optionally provide</List.Item>
                <List.Item>Dependent profiles you create on behalf of others (e.g. children)</List.Item>
              </List>

              <Text size="sm" fw={600}>2.2 Health &amp; Clinical Data</Text>
              <List size="sm" c="dimmed" spacing="xs" withPadding>
                <List.Item>Symptom descriptions you enter via text, voice, or live conversation</List.Item>
                <List.Item>Medical images, photographs, and documents (PDFs, lab reports) you upload</List.Item>
                <List.Item>Answers to AI follow-up questions (yes/no, scales, free text)</List.Item>
                <List.Item>Conditions, diagnoses, medications, SOAP notes, and other clinical outputs generated during assessments</List.Item>
                <List.Item>Diet plans, prescription history, and lab/imaging recommendations</List.Item>
                <List.Item>Dental chart findings and risk-assessment scores</List.Item>
                <List.Item>Insurance information you voluntarily enter</List.Item>
              </List>

              <Text size="sm" fw={600}>2.3 Usage &amp; Technical Data</Text>
              <List size="sm" c="dimmed" spacing="xs" withPadding>
                <List.Item>IP address, browser type, operating system, and device identifiers</List.Item>
                <List.Item>Pages visited, features used, and session duration</List.Item>
                <List.Item>Error logs and performance telemetry</List.Item>
                <List.Item>Google reCAPTCHA v3 scores (anti-fraud signals)</List.Item>
              </List>
            </Stack>
          </Section>

          <Divider />

          {/* 3 */}
          <Section title="3. How We Use Your Information">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>
                <strong>Delivering the Service:</strong> Processing your symptoms through our AI models to produce structured clinical reports.
              </List.Item>
              <List.Item>
                <strong>Authentication:</strong> Sending and verifying passwordless magic-link sign-in emails.
              </List.Item>
              <List.Item>
                <strong>Personalisation:</strong> Displaying your assessment history, saved conditions, medications, and documents in your personal portal.
              </List.Item>
              <List.Item>
                <strong>Safety &amp; Fraud Prevention:</strong> Using reCAPTCHA signals and rate-limiting to detect and block abusive traffic.
              </List.Item>
              <List.Item>
                <strong>Service Improvement:</strong> Aggregated and anonymised analytics to improve AI accuracy and platform features. We never train models on identifiable health data without explicit consent.
              </List.Item>
              <List.Item>
                <strong>Legal Compliance:</strong> Retaining records as required by applicable law and responding to valid legal requests.
              </List.Item>
              <List.Item>
                <strong>Communications:</strong> Sending transactional emails (sign-in links, account notices). We do not send marketing email without your explicit opt-in.
              </List.Item>
            </List>
          </Section>

          <Divider />

          {/* 4 */}
          <Section title="4. Health Data &amp; Sensitive Information">
            <Text size="sm" c="dimmed" lh={1.8}>
              Health data is Special Category data under GDPR and Protected Health Information (PHI) under
              HIPAA-equivalent frameworks. We treat it accordingly:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>All health data is encrypted in transit (TLS 1.3) and at rest (AES-256).</List.Item>
              <List.Item>Access to identifiable health records is restricted to systems that need it to operate the Service and to a minimal set of authorised personnel.</List.Item>
              <List.Item>We process your health data on the basis of your explicit consent, which you give when you submit a symptom assessment.</List.Item>
              <List.Item>You may withdraw consent and request deletion at any time (see Section 8).</List.Item>
              <List.Item>We do not sell, rent, or license your health data to any third party.</List.Item>
            </List>
          </Section>

          <Divider />

          {/* 5 */}
          <Section title="5. Third-Party Services &amp; Data Sharing">
            <Text size="sm" c="dimmed" lh={1.8}>
              We share data with the following categories of trusted sub-processors, each under
              contractual data-protection obligations:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>
                <strong>Google Firebase:</strong> Authentication, Firestore database, and file storage. Data processed in accordance with Google&apos;s Cloud Data Processing Addendum.
              </List.Item>
              <List.Item>
                <strong>Google reCAPTCHA v3:</strong> Collects browser signals to detect bots. Subject to Google&apos;s{" "}
                <Anchor href="https://policies.google.com/privacy" size="sm" target="_blank">Privacy Policy</Anchor>.
              </List.Item>
              <List.Item>
                <strong>AI Inference Providers:</strong> Your symptom descriptions are sent to large language model providers (e.g. Google Gemini, Anthropic Claude) solely for generating clinical assessments. These providers process data under strict data-processing agreements and do not use your content to train public models.
              </List.Item>
              <List.Item>
                <strong>Vercel / CDN:</strong> Hosting and edge delivery. No health data is stored at the CDN layer.
              </List.Item>
              <List.Item>
                <strong>Legal Disclosures:</strong> We may disclose information if required by law, court order, or to protect the safety of users or the public.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed" lh={1.8}>
              We do not share your personal or health data with advertisers, data brokers, or
              any third party for commercial purposes.
            </Text>
          </Section>

          <Divider />

          {/* 6 */}
          <Section title="6. Cookies &amp; Tracking">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>
                <strong>Strictly Necessary Cookies:</strong> Session tokens and CSRF protection required to operate the Service. Cannot be disabled.
              </List.Item>
              <List.Item>
                <strong>Performance Cookies:</strong> Anonymous telemetry for error tracking and performance monitoring.
              </List.Item>
              <List.Item>
                <strong>No Advertising Cookies:</strong> We do not use third-party advertising or cross-site tracking cookies.
              </List.Item>
            </List>
          </Section>

          <Divider />

          {/* 7 */}
          <Section title="7. Data Retention">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>
                <strong>Account &amp; Health Data:</strong> Retained for as long as your account is active plus 30 days, to allow account recovery.
              </List.Item>
              <List.Item>
                <strong>Assessment History:</strong> Stored indefinitely by default so you can review past reports. You can delete individual assessments or all history at any time from Settings.
              </List.Item>
              <List.Item>
                <strong>Uploaded Files:</strong> Retained until you delete them or close your account.
              </List.Item>
              <List.Item>
                <strong>Aggregated Analytics:</strong> Anonymised statistical data may be retained indefinitely; it cannot be linked back to you.
              </List.Item>
            </List>
          </Section>

          <Divider />

          {/* 8 */}
          <Section title="8. Your Rights">
            <Text size="sm" c="dimmed" lh={1.8}>
              Depending on your jurisdiction, you may have the following rights regarding your
              personal data:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item><strong>Access:</strong> Request a copy of all data we hold about you.</List.Item>
              <List.Item><strong>Correction:</strong> Ask us to correct inaccurate data.</List.Item>
              <List.Item><strong>Deletion (&quot;Right to Be Forgotten&quot;):</strong> Request deletion of your account and all associated data.</List.Item>
              <List.Item><strong>Restriction:</strong> Ask us to restrict processing while a dispute is resolved.</List.Item>
              <List.Item><strong>Portability:</strong> Receive a machine-readable export of your data.</List.Item>
              <List.Item><strong>Objection:</strong> Object to processing based on legitimate interests.</List.Item>
              <List.Item><strong>Withdraw Consent:</strong> Stop further health-data processing at any time; this does not affect past assessments.</List.Item>
            </List>
            <Text size="sm" c="dimmed" lh={1.8}>
              To exercise any right, email{" "}
              <Anchor href="mailto:privacy@care.ai" size="sm">privacy@care.ai</Anchor> or use
              the data controls in your account Settings. We will respond within 30 days.
            </Text>
          </Section>

          <Divider />

          {/* 9 */}
          <Section title="9. Children's Privacy">
            <Text size="sm" c="dimmed" lh={1.8}>
              The Service is not directed at children under 13 (or 16 in the EU). We do not
              knowingly collect personal data from children without verified parental consent.
              Parents may create dependent profiles for minor children; doing so constitutes
              parental consent to the collection and processing described in this policy for
              that child. If you believe a child has provided data without consent, contact us
              and we will delete it promptly.
            </Text>
          </Section>

          <Divider />

          {/* 10 */}
          <Section title="10. International Transfers">
            <Text size="sm" c="dimmed" lh={1.8}>
              CareAI and its sub-processors operate globally. If your data is transferred
              outside your country or region (including outside the European Economic Area),
              we ensure appropriate safeguards are in place — including Standard Contractual
              Clauses (SCCs) approved by the European Commission or equivalent mechanisms.
            </Text>
          </Section>

          <Divider />

          {/* 11 */}
          <Section title="11. Security Measures">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <List.Item>TLS 1.3 encryption for all data in transit</List.Item>
              <List.Item>AES-256 encryption for data at rest</List.Item>
              <List.Item>Passwordless authentication (magic links) — no passwords stored</List.Item>
              <List.Item>Role-based access control limiting employee access to health data</List.Item>
              <List.Item>Regular security audits and penetration testing</List.Item>
              <List.Item>Automatic session expiry and token rotation</List.Item>
            </List>
            <Text size="sm" c="dimmed" lh={1.8}>
              Despite these measures, no system is 100% secure. If you discover a vulnerability,
              please report it responsibly to{" "}
              <Anchor href="mailto:security@care.ai" size="sm">security@care.ai</Anchor>.
            </Text>
          </Section>

          <Divider />

          {/* 12 */}
          <Section title="12. Changes to This Policy">
            <Text size="sm" c="dimmed" lh={1.8}>
              We may update this policy from time to time. Material changes will be notified
              by email and/or a prominent banner in the app at least 14 days before taking
              effect. Continued use of the Service after that date constitutes acceptance of
              the updated policy.
            </Text>
          </Section>

          <Divider />

          {/* 13 */}
          <Section title="13. Contact &amp; Complaints">
            <Group gap={8} align="flex-start">
              <ThemeIcon size={22} radius="md" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                <IconMail size={13} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text size="sm" c="dimmed" lh={1.8}>
                  For privacy questions or requests: <Anchor href="mailto:privacy@care.ai" size="sm">privacy@care.ai</Anchor><br />
                  For security disclosures: <Anchor href="mailto:security@care.ai" size="sm">security@care.ai</Anchor><br />
                  For general support: <Anchor href="mailto:support@care.ai" size="sm">support@care.ai</Anchor>
                </Text>
                <Text size="sm" c="dimmed" lh={1.8}>
                  If you are in the EU and believe we have not handled your data correctly,
                  you have the right to lodge a complaint with your national data protection
                  authority.
                </Text>
              </Stack>
            </Group>
          </Section>

        </Stack>
      </Container>

      {/* Footer */}
      <Box
        py="lg"
        style={{
          borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
        }}
      >
        <Container size="lg">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap={8}>
              <ThemeIcon size={22} radius="md" color="primary" variant="light">
                <IconHeartbeat size={13} />
              </ThemeIcon>
              <Text size="sm" fw={700} c="primary">CareAI</Text>
              <Text size="xs" c="dimmed">© {new Date().getFullYear()}</Text>
            </Group>
            <Group gap="md">
              <Anchor href="/" size="xs" c="dimmed">Home</Anchor>
              <Anchor href="/terms" size="xs" c="dimmed">Terms</Anchor>
              <Anchor href="/privacy" size="xs" c="dimmed">Privacy</Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
      <Group gap="xs" justify="center" pb="lg">
        <ThemeIcon size={16} color="primary" variant="transparent">
          <IconShieldCheck size={14} />
        </ThemeIcon>
        <Text size="xs" c="dimmed">
          CareAI is not a substitute for professional medical advice, diagnosis, or treatment.
          Always seek the advice of a qualified health provider.
        </Text>
      </Group>
    </LegalLayout>
  );
}
