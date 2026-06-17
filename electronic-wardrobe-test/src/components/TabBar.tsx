import type { TabKey } from "../types";

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "home", label: "首页", icon: "🏠" },
  { key: "wardrobe", label: "衣橱", icon: "👗" },
  { key: "outfit", label: "搭配", icon: "✨" },
  { key: "settings", label: "我的", icon: "👤" },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#f5f5f7]/90 backdrop-blur-md border-t border-gray-200/60 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-12">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex flex-col items-center justify-center w-full h-full transition-colors"
            >
              <span className={`text-sm leading-none transition-transform ${isActive ? "scale-110" : ""}`}>
                {tab.icon}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-medium tracking-tight ${
                  isActive
                    ? "text-[#0071e3]"
                    : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
