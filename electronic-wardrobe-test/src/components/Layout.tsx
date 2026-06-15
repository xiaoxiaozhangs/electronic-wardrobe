import type { ReactNode } from "react";
import type { TabKey } from "../types";
import TabBar from "./TabBar";

interface LayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  children: ReactNode;
  title?: string;
  headerAction?: ReactNode;
}

export default function Layout({
  activeTab,
  onTabChange,
  children,
  title,
  headerAction,
}: LayoutProps) {
  return (
    <div className="mobile-container relative pb-16">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
          <div className="flex items-center justify-between h-12 px-4">
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </header>
      )}

      {/* Content */}
      <main className="px-4 py-4 min-h-[calc(100vh-8rem)]">{children}</main>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
