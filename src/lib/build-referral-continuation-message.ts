export function buildReferralContinuationMessage(
  specialist: string,
  reason?: string,
  reportLabel?: string,
): string {
  const reportPart = reportLabel ? `my ${reportLabel}` : "my recent imaging";
  const reasonPart = reason ? ` The radiologist noted: ${reason}.` : "";
  return `I have been referred to you from radiology after reviewing ${reportPart}.${reasonPart} Please begin my ${specialist} consultation.`;
}
