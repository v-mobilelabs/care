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
  IconFileDescription,
  IconShieldCheck,
} from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terms & Conditions — CareAI",
  description: "The terms and conditions governing your use of the CareAI platform.",
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

export default function TermsPage() {
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
              <IconFileDescription size={28} />
            </ThemeIcon>
            <Title ta="center" style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)" }}>
              Terms &amp; Conditions
            </Title>
            <Text size="md" c="dimmed" ta="center" maw={540}>
              Please read these terms carefully before using CareAI. By accessing or using
              the Service, you agree to be bound by them.
            </Text>
            <Text size="xs" c="dimmed">Last updated: {LAST_UPDATED}</Text>
          </Stack>
        </Container>
      </Box>

      {/* Body */}
      <Container size="md" py={{ base: 48, sm: 72 }}>
        <Stack gap="xl">

          {/* Medical Disclaimer — prominent */}
          <Box
            p="lg"
            style={{
              borderRadius: "var(--mantine-radius-lg)",
              background: "light-dark(var(--mantine-color-red-0), rgba(200,0,0,0.08))",
              border: "1px solid light-dark(var(--mantine-color-red-3), var(--mantine-color-red-9))",
            }}
          >
            <Stack gap="xs">
              <Group gap={8}>
                <ThemeIcon size={22} color="red" variant="light" radius="md">
                  <IconShieldCheck size={13} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="red">Important Medical Disclaimer</Text>
              </Group>
              <Text size="sm" lh={1.8} c="dimmed">
                CareAI provides <strong>AI-generated informational assessments only</strong>.
                It is <strong>not a licensed medical practice</strong>, not a substitute for
                professional medical advice, diagnosis, or treatment, and does not establish
                a doctor-patient relationship. Always consult a qualified healthcare provider
                before making any medical decision. <strong>In a medical emergency, call your
                  local emergency services immediately.</strong>
              </Text>
            </Stack>
          </Box>

          {/* 1 */}
          <Section title="1. Acceptance of Terms">
            <Text size="sm" c="dimmed" lh={1.8}>
              By creating an account, accessing, or otherwise using the CareAI platform
              (&quot;Service&quot;) operated by CosmoOps (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you confirm
              that you have read, understood, and agree to be legally bound by these Terms
              &amp; Conditions and our{" "}
              <Anchor href="/privacy" size="sm">Privacy Policy</Anchor>.
              If you do not agree, do not use the Service.
            </Text>
            <Text size="sm" c="dimmed" lh={1.8}>
              We reserve the right to update these Terms at any time. Material changes will
              be notified at least 14 days in advance. Continued use of the Service constitutes
              acceptance.
            </Text>
          </Section>

          <Divider />

          {/* 2 */}
          <Section title="2. Eligibility">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>You must be at least 13 years old (or 16 in the EU/UK) to use the Service independently.</li>
              <li>If you are between 13 and 18, you must have parental or guardian consent.</li>
              <li>You must have legal capacity to enter into a binding contract.</li>
              <li>You may not use the Service where doing so violates local laws or regulations.</li>
            </List>
          </Section>

          <Divider />

          {/* 3 */}
          <Section title="3. Nature of the Service — Not Medical Advice">
            <Text size="sm" c="dimmed" lh={1.8}>
              CareAI is an <strong>AI-powered clinical information service</strong>. All outputs — including
              but not limited to conditions, diagnoses, medication suggestions, lab orders, SOAP
              notes, diet plans, dental charts, and risk scores — are generated by artificial
              intelligence and are <strong>informational only</strong>.
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>CareAI is NOT a licensed medical device, hospital, clinic, or pharmacy.</li>
              <li>No output from CareAI constitutes a diagnosis, prescription, or professional medical opinion.</li>
              <li>AI models may produce errors, hallucinations, or outdated information. Never rely solely on CareAI outputs for any health decision.</li>
              <li>Always seek the advice of a qualified physician, pharmacist, or other licensed health professional.</li>
              <li>CareAI does not monitor your health in real time and is not an emergency service.</li>
            </List>
          </Section>

          <Divider />

          {/* 4 */}
          <Section title="4. Emergency Situations">
            <Text size="sm" c="dimmed" lh={1.8} fw={600}>
              If you or someone else is experiencing a medical emergency — including chest pain,
              difficulty breathing, stroke symptoms, severe bleeding, loss of consciousness, or
              thoughts of self-harm — stop using this application immediately and call your
              local emergency number (e.g. 911, 999, 112).
            </Text>
            <Text size="sm" c="dimmed" lh={1.8}>
              CareAI is not designed or equipped to handle time-critical emergencies.
              Relying on it in an emergency could cause serious harm or death.
            </Text>
          </Section>

          <Divider />

          {/* 5 */}
          <Section title="5. Account Registration &amp; Security">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>You are responsible for maintaining the security of your email account, as magic-link authentication grants access via your inbox.</li>
              <li>You must notify us immediately at <Anchor href="mailto:support@care.ai" size="sm">support@care.ai</Anchor> if you suspect unauthorised access.</li>
              <li>One account per person. You may not create accounts on behalf of others except for dependent profiles (e.g. minor children) as permitted by the Service.</li>
              <li>You may not share account access with other individuals.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </List>
          </Section>

          <Divider />

          {/* 6 */}
          <Section title="6. Acceptable Use">
            <Text size="sm" c="dimmed" lh={1.8}>You agree not to:</Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>Use the Service for any unlawful purpose or in violation of applicable laws.</li>
              <li>Submit false, misleading, or fraudulent health information.</li>
              <li>Attempt to reverse-engineer, scrape, or extract data from the Service.</li>
              <li>Upload content that infringes third-party intellectual property rights.</li>
              <li>Use the Service to harass, harm, or deceive other individuals.</li>
              <li>Attempt to bypass security, rate-limiting, or authentication mechanisms.</li>
              <li>Use automated tools (bots, scrapers, crawlers) to access the Service without written permission.</li>
              <li>Use the Service to provide clinical advice to others in a professional capacity without appropriate regulatory authorisation.</li>
            </List>
          </Section>

          <Divider />

          {/* 7 */}
          <Section title="7. User Content">
            <Text size="sm" c="dimmed" lh={1.8}>
              &quot;User Content&quot; means any data, text, images, documents, or other material
              you submit to the Service (e.g. symptom descriptions, uploaded files, voice recordings).
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>You retain ownership of your User Content.</li>
              <li>
                You grant CareAI a limited, non-exclusive, worldwide licence to store, process,
                and transmit your User Content solely to provide the Service to you and as
                described in our{" "}
                <Anchor href="/privacy" size="sm">Privacy Policy</Anchor>.
              </li>
              <li>You represent that you have the right to submit all content you provide and that it does not violate any law or third-party rights.</li>
              <li>You are responsible for ensuring uploaded medical documents are your own or that you have authorisation to share them.</li>
            </List>
          </Section>

          <Divider />

          {/* 8 */}
          <Section title="8. AI Outputs &amp; Accuracy">
            <Text size="sm" c="dimmed" lh={1.8}>
              CareAI's clinical outputs are generated by large language models and are
              subject to the following limitations:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li><strong>Not exhaustive:</strong> AI assessments may miss conditions, drug interactions, or contraindications relevant to your specific circumstances.</li>
              <li><strong>Not personalised clinical care:</strong> Outputs do not account for your full medical history unless you explicitly provide it.</li>
              <li><strong>Drug recommendations are informational:</strong> Any medication or dosage suggestion must be verified with a licensed pharmacist or prescribing physician before use.</li>
              <li><strong>ICD-10 codes are indicative:</strong> Codes assigned by the AI are for reference only and are not official diagnostic codes for insurance or billing purposes.</li>
              <li><strong>Model limitations:</strong> AI outputs may contain errors, outdated clinical guidelines, or information that does not apply to you.</li>
            </List>
          </Section>

          <Divider />

          {/* 9 */}
          <Section title="9. Credits &amp; Payments">
            <Text size="sm" c="dimmed" lh={1.8}>
              Certain features of the Service may require the purchase of credits or a
              subscription. Where applicable:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>All prices are displayed inclusive of applicable taxes unless noted otherwise.</li>
              <li>Credits are non-transferable and have no cash value.</li>
              <li>Unused credits may expire; expiry terms are shown at point of purchase.</li>
              <li>Refunds are provided in accordance with our Refund Policy and applicable consumer law.</li>
              <li>We reserve the right to change pricing with 30 days' notice for subscription plans.</li>
            </List>
          </Section>

          <Divider />

          {/* 10 */}
          <Section title="10. Intellectual Property">
            <Text size="sm" c="dimmed" lh={1.8}>
              All software, design, AI models, prompts, trademarks, logos, and content
              created by CareAI (excluding User Content) are the exclusive property of
              CosmoOps and are protected by intellectual property law. You may not copy,
              modify, distribute, reverse-engineer, or create derivative works without
              prior written consent.
            </Text>
            <Text size="sm" c="dimmed" lh={1.8}>
              Clinical reports generated for you are provided for your personal, non-commercial
              use. You may share them with your healthcare providers. You may not resell or
              republish them.
            </Text>
          </Section>

          <Divider />

          {/* 11 */}
          <Section title="11. Disclaimer of Warranties">
            <Text size="sm" c="dimmed" lh={1.8}>
              To the maximum extent permitted by law, the Service is provided{" "}
              <strong>&quot;as is&quot;</strong> and{" "}
              <strong>&quot;as available&quot;</strong> without warranties of any kind, whether express or implied,
              including without limitation warranties of merchantability, fitness for a
              particular purpose, accuracy, reliability, or non-infringement.
            </Text>
            <Text size="sm" c="dimmed" lh={1.8}>
              We do not warrant that the Service will be uninterrupted, error-free, or
              free from harmful components. We do not warrant that any AI output is medically
              accurate, complete, or suitable for clinical decision-making.
            </Text>
          </Section>

          <Divider />

          {/* 12 */}
          <Section title="12. Limitation of Liability">
            <Text size="sm" c="dimmed" lh={1.8}>
              To the fullest extent permitted by applicable law, CosmoOps, its directors,
              employees, agents, and licensors shall not be liable for:
            </Text>
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Loss of profits, data, goodwill, or other intangible losses.</li>
              <li>Any harm arising from reliance on AI-generated clinical outputs.</li>
              <li>Decisions made or not made based on information provided by the Service.</li>
              <li>Any harm resulting from delay in seeking professional medical help.</li>
            </List>
            <Text size="sm" c="dimmed" lh={1.8}>
              Our total liability to you for any claim shall not exceed the greater of (a) the
              amount you paid us in the 12 months preceding the claim or (b) £50 / $50 USD.
              Some jurisdictions do not allow exclusion of implied warranties or limitation
              of liability, so parts of this section may not apply to you.
            </Text>
          </Section>

          <Divider />

          {/* 13 */}
          <Section title="13. Indemnification">
            <Text size="sm" c="dimmed" lh={1.8}>
              You agree to indemnify, defend, and hold harmless CosmoOps and its affiliates
              from any claims, liabilities, damages, costs, and expenses (including reasonable
              legal fees) arising from (a) your use of the Service in breach of these Terms,
              (b) your User Content, or (c) any misrepresentation you make.
            </Text>
          </Section>

          <Divider />

          {/* 14 */}
          <Section title="14. Third-Party Links &amp; Services">
            <Text size="sm" c="dimmed" lh={1.8}>
              The Service may contain links to third-party websites or references to
              external resources. These are provided for convenience only. We do not endorse,
              control, or accept responsibility for any third-party content or privacy practices.
              Use of third-party services is at your own risk.
            </Text>
          </Section>

          <Divider />

          {/* 15 */}
          <Section title="15. Termination">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li>You may delete your account at any time from Settings. This will initiate data deletion as described in our Privacy Policy.</li>
              <li>We may suspend or terminate your account immediately for material breach of these Terms, illegal activity, or to protect the safety of others.</li>
              <li>Upon termination, your right to use the Service ceases immediately. Sections 3, 8, 10, 11, 12, 13 and 17 survive termination.</li>
            </List>
          </Section>

          <Divider />

          {/* 16 */}
          <Section title="16. Governing Law &amp; Dispute Resolution">
            <Text size="sm" c="dimmed" lh={1.8}>
              These Terms are governed by the laws of England and Wales, without regard to
              conflict-of-law rules. Any dispute that cannot be resolved amicably shall be
              subject to the exclusive jurisdiction of the courts of England and Wales, except
              where mandatory consumer-protection laws in your jurisdiction provide otherwise.
            </Text>
          </Section>

          <Divider />

          {/* 17 */}
          <Section title="17. General">
            <List size="sm" c="dimmed" spacing="xs" withPadding>
              <li><strong>Entire Agreement:</strong> These Terms and the Privacy Policy constitute the entire agreement between you and CosmoOps regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions continue in full force.</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not constitute a waiver of that right.</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign them in connection with a merger, acquisition, or sale of assets.</li>
            </List>
          </Section>

          <Divider />

          {/* 18 */}
          <Section title="18. Contact Us">
            <Text size="sm" c="dimmed" lh={1.8}>
              For questions about these Terms, contact us at:{" "}
              <Anchor href="mailto:legal@care.ai" size="sm">legal@care.ai</Anchor>
            </Text>
          </Section>

        </Stack>
      </Container>
    </LegalLayout>
  );
}
