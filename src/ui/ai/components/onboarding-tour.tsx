"use client";
import {
  Badge,
  Button,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconFolder,
  IconMessageChatbot,
  IconStethoscope,
  IconFileText,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import Link, { useLinkStatus } from "@/ui/link";
import { colors, spacing } from "@/ui/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingTourProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onComplete: () => Promise<void>;
}

interface StepContent {
  title: string;
  description: string;
  mobileDescription?: string;
  icon: React.ReactNode;
  action?: Readonly<{
    label: string;
    href: string;
    eventAction: "upload_records" | "connect_doctor";
    icon: React.ReactNode;
  }>;
}

// ── Step Definitions ──────────────────────────────────────────────────────────

const STEPS: StepContent[] = [
  {
    title: "Welcome to CareAI Assistant",
    description:
      "This workspace remembers your health history. Every conversation becomes a record that informs smarter, more personalized guidance in follow-ups.",
    mobileDescription:
      "This workspace remembers your health history for smarter, personalized follow-ups.",
    icon: <IconCircleCheck size={24} style={{ color: colors.success }} />,
  },
  {
    title: "Start Chatting",
    description:
      "Describe your health concern in plain language. CareAI will ask focused follow-up questions and create structured assessments that turn conversations into actionable clinical insights.",
    mobileDescription:
      "Describe your concern naturally. CareAI creates structured assessments and next steps.",
    icon: <IconMessageChatbot size={24} style={{ color: colors.brand }} />,
  },
  {
    title: "Your Medical Records",
    description:
      "Share your medical records, lab results, and prescriptions. I'll help you understand them, track your health over time, and carry that context into every future conversation.",
    mobileDescription:
      "Upload reports, labs, and prescriptions for easier tracking and ongoing context.",
    icon: <IconFileText size={24} style={{ color: colors.brand }} />,
    action: {
      label: "Open files library",
      href: "/user/health/records",
      eventAction: "upload_records",
      icon: <IconFolder size={14} />,
    },
  },
  {
    title: "Get Started",
    description:
      "You're all set. For urgent symptoms or high-risk concerns, connect with a licensed doctor immediately. CareAI prepares your history for that conversation.",
    mobileDescription:
      "For urgent symptoms, find a doctor now. CareAI prepares your care history.",
    icon: <IconArrowRight size={24} style={{ color: colors.warning }} />,
    action: {
      label: "Find available doctors",
      href: "/user/connect",
      eventAction: "connect_doctor",
      icon: <IconStethoscope size={14} />,
    },
  },
];

const ONBOARDING_STEP_KEY = "careai-onboarding-active-step";

function OnboardingActionLabel({ label }: Readonly<{ label: string }>) {
  const { pending } = useLinkStatus();
  return <>{pending ? "Opening…" : label}</>;
}

// ── Component ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export function OnboardingTour({
  opened,
  onClose,
  onComplete,
}: Readonly<OnboardingTourProps>) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [wasResumed, setWasResumed] = useState(false);

  const currentStep = STEPS[activeStep];
  const currentDescription = isMobile
    ? (currentStep.mobileDescription ?? currentStep.description)
    : currentStep.description;
  const progress = ((activeStep + 1) / STEPS.length) * 100;
  const isLastStep = activeStep === STEPS.length - 1;
  const modalRadius = isMobile ? "0" : "var(--mantine-radius-lg)";
  const contentGap = isMobile ? spacing.lg : spacing.xl;
  const stepGap = isMobile ? spacing.md : spacing.lg;
  const descriptionLines = isMobile ? 6 : 4;

  useEffect(() => {
    if (!opened) return;
    setWasResumed(false);

    const raw = globalThis.localStorage.getItem(ONBOARDING_STEP_KEY);
    if (!raw) return;

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;

    const bounded = Math.min(Math.max(parsed, 0), STEPS.length - 1);
    if (bounded === 0) return;

    setActiveStep(bounded);
    setWasResumed(true);
    trackEvent({
      name: "onboarding_tour_resumed",
      params: { step_index: bounded + 1 },
    });
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    globalThis.localStorage.setItem(ONBOARDING_STEP_KEY, String(activeStep));
  }, [activeStep, opened]);

  const handleNext = () => {
    setWasResumed(false);
    if (isLastStep) {
      handleComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setWasResumed(false);
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete();
      globalThis.localStorage.removeItem(ONBOARDING_STEP_KEY);
      trackEvent({
        name: "onboarding_tour_completed",
        params: { steps_viewed: STEPS.length },
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    globalThis.localStorage.removeItem(ONBOARDING_STEP_KEY);
    trackEvent({
      name: "onboarding_tour_skipped",
      params: { steps_viewed: activeStep + 1 },
    });
    onClose();
  };

  function handleRestartTour() {
    setWasResumed(false);
    setActiveStep(0);
    globalThis.localStorage.setItem(ONBOARDING_STEP_KEY, "0");
    notifications.show({
      title: "Tour restarted",
      message: "You're back at step 1.",
      color: colors.success,
      icon: <IconCheck size={16} />,
    });
    trackEvent({
      name: "onboarding_tour_restarted",
      params: { from_step_index: activeStep + 1 },
    });
  }

  function handleStepActionClick() {
    if (!currentStep.action) return;
    trackEvent({
      name: "onboarding_tour_action_clicked",
      params: {
        action: currentStep.action.eventAction,
        step_index: activeStep + 1,
      },
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleSkip}
      title={null}
      centered={!isMobile}
      fullScreen={isMobile}
      size={isMobile ? "100%" : "md"}
      withCloseButton={false}
      closeOnEscape={true}
      closeOnClickOutside={false}
      styles={{
        content: {
          borderRadius: modalRadius,
        },
      }}
    >
      <Stack gap={contentGap} py={isMobile ? spacing.lg : spacing.md}>
        {/* Progress Bar */}
        <Progress
          value={progress}
          size="sm"
          style={{
            backgroundColor: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
          }}
          styles={{
            section: {
              background: `linear-gradient(90deg, var(--mantine-color-primary-5), var(--mantine-color-primary-6))`,
            },
          }}
        />

        {/* Stepper View */}
        <Stack gap={stepGap}>
          <Group justify="center">
            {currentStep.icon}
          </Group>

          <div style={{ textAlign: "center" }}>
            {wasResumed && (
              <Group justify="center" mb={spacing.xs} gap={6}>
                <Badge size="xs" variant="light" color="primary">
                  Resuming your tour at step {activeStep + 1}
                </Badge>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  onClick={handleRestartTour}
                >
                  Restart tour
                </Button>
              </Group>
            )}
            <Title order={3} mb={spacing.sm}>
              {currentStep.title}
            </Title>
            <Text
              size="sm"
              style={{
                color: "light-dark(var(--mantine-color-gray-600), var(--mantine-color-gray-400))",
              }}
              lineClamp={descriptionLines}
            >
              {currentDescription}
            </Text>

            {currentStep.action && (
              <Group justify="center" mt={spacing.md}>
                <Button
                  size={isMobile ? "sm" : "xs"}
                  variant="light"
                  color="primary"
                  component={Link}
                  href={currentStep.action.href}
                  leftSection={currentStep.action.icon}
                  onClick={handleStepActionClick}
                  fullWidth={isMobile}
                  maw={isMobile ? undefined : 220}
                >
                  <OnboardingActionLabel label={currentStep.action.label} />
                </Button>
              </Group>
            )}
          </div>

          {/* Step Counter */}
          <Text
            size="xs"
            ta="center"
            style={{
              color: "light-dark(var(--mantine-color-gray-500), var(--mantine-color-gray-500))",
            }}
          >
            {activeStep + 1} of {STEPS.length}
          </Text>
        </Stack>

        {/* Navigation */}
        {(() => {
          if (isMobile) {
            return (
              <Stack gap={spacing.xs} mt={spacing.md}>
                <Button
                  onClick={handleNext}
                  loading={isLoading}
                  disabled={isLoading}
                  fullWidth
                >
                  {isLastStep ? "Start using CareAI" : "Next"}
                </Button>
                <Group grow>
                  <Button
                    variant="subtle"
                    onClick={handleBack}
                    disabled={activeStep === 0 || isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={handleSkip}
                    disabled={isLoading}
                  >
                    Skip
                  </Button>
                </Group>
              </Stack>
            );
          }

          return (
            <Group justify="space-between" mt={spacing.lg}>
              <Button
                variant="subtle"
                onClick={handleSkip}
                disabled={isLoading}
              >
                Skip
              </Button>

              <Group gap={spacing.sm}>
                <Button
                  variant="subtle"
                  onClick={handleBack}
                  disabled={activeStep === 0 || isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLastStep ? "Start using CareAI" : "Next"}
                </Button>
              </Group>
            </Group>
          );
        })()}
      </Stack>
    </Modal>
  );
}
