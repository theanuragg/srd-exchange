'use client';

import BottomNavbar from '@/components/bottom-navbar';
import RightSidebar from '@/components/RightSidebar';
import { useSidebar } from '@/context/SidebarContext';

function SidebarWrapper() {
    const { isSidebarOpen, closeSidebar } = useSidebar();
    return <RightSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />;
}

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black pb-28">
            {children}
            <SidebarWrapper />
            <BottomNavbar />
        </div>
    );
}
