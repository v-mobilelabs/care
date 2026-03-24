import { Suspense } from "react";
import { MemoriesContent } from "./_content";
import MemoriesLoading from "./loading";

export default function MemoriesPage() {
    return (
        <Suspense fallback={<MemoriesLoading />}>
            <MemoriesContent />
        </Suspense>
    );
}
