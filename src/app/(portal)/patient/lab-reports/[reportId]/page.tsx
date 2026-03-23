import { LabReportDetailContent } from "./_content";

export default async function LabReportDetailPage({ params }: Readonly<{ params: Promise<{ reportId: string }> }>) {
    const { reportId } = await params;
    return <LabReportDetailContent reportId={reportId} />;
}
