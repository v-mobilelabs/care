import { AssessmentDetailContent } from "./_content";

export default async function AssessmentDetailPage(
    props: Readonly<{ params: Promise<{ assessmentId: string }> }>,
) {
    const { assessmentId } = await props.params;
    return <AssessmentDetailContent assessmentId={assessmentId} />;
}
