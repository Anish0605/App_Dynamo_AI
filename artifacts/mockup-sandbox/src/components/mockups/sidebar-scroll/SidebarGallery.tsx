import { StickyZones } from "./StickyZones";
import { CollapsibleFolders } from "./CollapsibleFolders";
import { TabSwitcher } from "./TabSwitcher";

export default function SidebarGallery() {
  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="h-[760px] overflow-hidden rounded-2xl shadow-xl border border-gray-200 bg-white">
          <StickyZones />
        </div>
        <div className="h-[760px] overflow-hidden rounded-2xl shadow-xl border border-gray-200 bg-white">
          <CollapsibleFolders />
        </div>
        <div className="h-[760px] overflow-hidden rounded-2xl shadow-xl border border-gray-200 bg-white">
          <TabSwitcher />
        </div>
      </div>
    </div>
  );
}