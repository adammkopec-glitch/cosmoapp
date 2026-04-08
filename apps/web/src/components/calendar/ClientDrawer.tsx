// apps/web/src/components/calendar/ClientDrawer.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawerVisitTab } from './ClientDrawer/DrawerVisitTab';
import { DrawerHistoryTab } from './ClientDrawer/DrawerHistoryTab';
import { DrawerJournalTab } from './ClientDrawer/DrawerJournalTab';
import { DrawerRoutineTab } from './ClientDrawer/DrawerRoutineTab';
import { DrawerProductsTab } from './ClientDrawer/DrawerProductsTab';

const TABS = ['Wizyta', 'Historia', 'Dziennik', 'Rutyna', 'Produkty'] as const;
type Tab = typeof TABS[number];

interface Props {
  appointment: any; // appointment object from getAll()
  onClose: () => void;
}

export function ClientDrawer({ appointment, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Wizyta');
  const navigate = useNavigate();

  const user = appointment.user; // { name, email, phone } from getAll include

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/20 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="
        fixed right-0 top-0 h-full w-full md:w-80 bg-white z-40
        shadow-xl border-l-2 border-indigo-600
        flex flex-col overflow-hidden
        animate-in slide-in-from-right duration-200
      ">
        {/* Header */}
        <div className="p-3 border-b border-gray-100 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate">{user?.name ?? '—'}</div>
            <div className="text-xs text-gray-500">{user?.phone ?? ''}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => navigate(`/admin/uzytkownicy/${appointment.userId}`)}
              className="bg-indigo-600 text-white text-xs px-2 py-1 rounded hover:bg-indigo-700"
            >
              Profil ↗
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-2.5 py-2 text-[11px] font-medium whitespace-nowrap
                ${activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'Wizyta' && <DrawerVisitTab appointment={appointment} />}
          {activeTab === 'Historia' && <DrawerHistoryTab userId={appointment.userId} />}
          {activeTab === 'Dziennik' && <DrawerJournalTab userId={appointment.userId} />}
          {activeTab === 'Rutyna' && <DrawerRoutineTab userId={appointment.userId} />}
          {activeTab === 'Produkty' && <DrawerProductsTab userId={appointment.userId} />}
        </div>
      </div>
    </>
  );
}
