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
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              activeTab === tab.key
                ? "text-primary-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-xs mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
