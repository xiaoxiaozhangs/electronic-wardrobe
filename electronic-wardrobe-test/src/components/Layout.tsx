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
    <div className="mobile-container relative pb-14">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-md border-b border-gray-200/60">
          <div className="flex items-center justify-between h-11 px-4">
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </header>
      )}

      {/* Content */}
      <main className="px-4 py-3 min-h-[calc(100vh-7rem)]">{children}</main>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
