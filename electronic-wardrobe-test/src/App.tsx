import { useState, useCallback } from "react";
import type { TabKey } from "./types";
import { useWardrobeStore } from "./store/wardrobeStore";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import WardrobePage from "./pages/WardrobePage";
import OutfitPage from "./pages/OutfitPage";
import SettingsPage from "./pages/SettingsPage";

const PAGE_TITLES: Record<TabKey, string> = {
  home: "首页",
  wardrobe: "衣橱",
  outfit: "搭配",
  settings: "我的",
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const store = useWardrobeStore();

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  // Loading state
  if (store.loading) {
    return (
      <div className="mobile-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">👗</div>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomePage
            items={store.items}
            outfits={store.outfits}
            onTabChange={handleTabChange}
            onToggleOutfitFavorite={store.toggleOutfitFavorite}
            onSetOutfitFeedback={store.setOutfitFeedback}
          />
        );
      case "wardrobe":
        return (
          <WardrobePage
            items={store.items}
            onAddItem={store.addItem}
            onUpdateItem={store.updateItem}
            onDeleteItem={store.deleteItem}
            onToggleFavorite={store.toggleFavorite}
          />
        );
      case "outfit":
        return (
          <OutfitPage
            items={store.items}
            outfits={store.outfits}
            onGenerate={store.generateAndSaveOutfits}
            onToggleFavorite={store.toggleOutfitFavorite}
            onFeedback={store.setOutfitFeedback}
            onDelete={store.deleteOutfit}
          />
        );
      case "settings":
        return (
          <SettingsPage
            items={store.items}
            outfits={store.outfits}
            onReset={store.resetAllData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      title={PAGE_TITLES[activeTab]}
    >
      {renderPage()}
    </Layout>
  );
}
