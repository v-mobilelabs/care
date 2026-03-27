import { PrescriptionDetailContent } from "./_content";

export default async function PrescriptionDetailPage({ params }: Readonly<{ params: Promise<{ prescriptionId: string }> }>) {
    const { prescriptionId } = await params;
    return <PrescriptionDetailContent prescriptionId={prescriptionId} />;
}
