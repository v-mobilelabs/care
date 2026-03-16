import { IncomingCallNotifications } from "./(portal)/_incoming-call-toast";

export default function DoctorRootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <>
        {children}
        <IncomingCallNotifications />
    </>;
}
