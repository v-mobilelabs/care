// Root doctor layout — just a passthrough.
// Sub-layouts ((auth) and (portal)) handle the visual chrome.
export default function DoctorRootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <>{children}</>;
}
