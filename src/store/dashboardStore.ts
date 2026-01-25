/**
 * Dashboard Store - Zustand State Management
 * Handles widget management, layout persistence, and dashboard state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WidgetConfig, WidgetData, DashboardLayout, DashboardTemplate } from '@/types/widget';
import { STORAGE_KEYS, DASHBOARD_TEMPLATES } from '@/lib/constants';

export type DashboardType = 'starter' | 'crypto' | 'indian-market';

interface DashboardState {
  // Dashboard data
  widgets: WidgetConfig[];
  widgetData: Record<string, WidgetData>;
  activeLayout: string;
  layouts: DashboardLayout[];
  watchlist: string[];
  currentDashboardType: DashboardType;

  // UI state
  isAddWidgetOpen: boolean;
  isTemplateDialogOpen: boolean;
  editingWidget: WidgetConfig | null;
  theme: 'light' | 'dark';

  // Actions
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  setWidgets: (widgets: WidgetConfig[]) => void;

  // Watchlist actions
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Widget data actions
  setWidgetData: (id: string, data: Partial<WidgetData>) => void;
  setWidgetLoading: (id: string, loading: boolean) => void;
  setWidgetError: (id: string, error: string | null) => void;

  // Layout actions
  saveLayout: (name: string) => void;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
  exportDashboard: () => string;
  importDashboard: (json: string) => boolean;
  loadTemplate: (template: DashboardTemplate, force?: boolean) => void;

  // UI actions
  setAddWidgetOpen: (open: boolean) => void;
  setTemplateDialogOpen: (open: boolean) => void;
  setEditingWidget: (widget: WidgetConfig | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentDashboardType: (type: DashboardType) => void;

  // Reset
  resetDashboard: () => void;
}

const initialState = {
  widgets: [],
  widgetData: {},
  activeLayout: 'default',
  layouts: [],
  watchlist: [],
  currentDashboardType: 'starter' as const,
  isAddWidgetOpen: false,
  isTemplateDialogOpen: false,
  editingWidget: null,
  theme: 'dark' as const,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Add a new widget
      addWidget: (widget) => {
        const state = get();
        // Ensure ID is unique even if added rapidly
        const uniqueId = `widget-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        const taggedWidget = {
          ...widget,
          id: widget.id.startsWith('temp-') ? uniqueId : widget.id,
          dashboardType: state.currentDashboardType
        };

        set((state) => ({
          widgets: [...state.widgets, taggedWidget],
          widgetData: {
            ...state.widgetData,
            [taggedWidget.id]: {
              id: taggedWidget.id,
              data: null,
              loading: false,
              error: null,
              lastFetched: null,
            },
          },
        }));
      },

      // Remove a widget
      removeWidget: (id) => {
        set((state) => {
          const { [id]: removed, ...remainingData } = state.widgetData;
          return {
            widgets: state.widgets.filter((w) => w.id !== id),
            widgetData: remainingData,
          };
        });
      },

      // Update widget configuration
      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates, lastUpdated: Date.now() } : w
          ),
        }));
      },

      // Reorder widgets for CURRENT dashboard ONLY (prevents wiping other dashboards)
      reorderWidgets: (newFilteredWidgets) => {
        const state = get();
        const currentType = state.currentDashboardType;

        // Preserve widgets from OTHER dashboards
        const otherWidgets = state.widgets.filter((w) =>
          w.dashboardType && w.dashboardType !== currentType
        );

        // Merge preserved widgets with the new order of current widgets
        set({ widgets: [...otherWidgets, ...newFilteredWidgets] });
      },

      // Set ALL widgets globally
      setWidgets: (widgets) => {
        set({ widgets });
      },

      // Watchlist actions
      addToWatchlist: (symbol) => {
        set((state) => {
          if (state.watchlist.includes(symbol)) return state;
          return { watchlist: [...state.watchlist, symbol] };
        });
      },

      removeFromWatchlist: (symbol) => {
        set((state) => ({
          watchlist: state.watchlist.filter((s) => s !== symbol),
        }));
      },

      // Set widget data
      setWidgetData: (id, data) => {
        set((state) => ({
          widgetData: {
            ...state.widgetData,
            [id]: {
              ...state.widgetData[id],
              ...data,
              lastFetched: Date.now(),
            },
          },
        }));
      },

      // Set widget loading state
      setWidgetLoading: (id, loading) => {
        set((state) => ({
          widgetData: {
            ...state.widgetData,
            [id]: {
              ...state.widgetData[id],
              id,
              loading,
              data: state.widgetData[id]?.data || null,
              error: state.widgetData[id]?.error || null,
              lastFetched: state.widgetData[id]?.lastFetched || null,
            },
          },
        }));
      },

      // Set widget error
      setWidgetError: (id, error) => {
        set((state) => ({
          widgetData: {
            ...state.widgetData,
            [id]: {
              ...state.widgetData[id],
              id,
              error,
              loading: false,
              data: state.widgetData[id]?.data || null,
              lastFetched: state.widgetData[id]?.lastFetched || null,
            },
          },
        }));
      },

      // Save current layout
      saveLayout: (name) => {
        const { widgets } = get();
        const layout: DashboardLayout = {
          id: `layout-${Date.now()}`,
          name,
          widgets,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          layouts: [...state.layouts, layout],
          activeLayout: layout.id,
        }));
      },

      // Load a saved layout
      loadLayout: (id) => {
        const { layouts } = get();
        const layout = layouts.find((l) => l.id === id);
        if (layout) {
          set({
            widgets: layout.widgets,
            activeLayout: id,
            widgetData: {},
          });
        }
      },

      // Delete a layout
      deleteLayout: (id) => {
        set((state) => ({
          layouts: state.layouts.filter((l) => l.id !== id),
        }));
      },

      // Export dashboard configuration as JSON
      exportDashboard: () => {
        const { widgets, layouts, theme, watchlist } = get();
        return JSON.stringify({ widgets, layouts, theme, watchlist, exportedAt: Date.now() }, null, 2);
      },

      // Import dashboard configuration from JSON
      importDashboard: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.widgets && Array.isArray(data.widgets)) {
            set({
              widgets: data.widgets,
              layouts: data.layouts || [],
              theme: data.theme || 'dark',
              watchlist: data.watchlist || [],
              widgetData: {},
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Load a dashboard template
      loadTemplate: (template, force = false) => {
        const dashboardType = (template.id === 'crypto'
          ? 'crypto'
          : template.id === 'indian-market'
            ? 'indian-market'
            : 'starter') as DashboardType;

        const currentWidgets = get().widgets;
        const existingDashboardWidgets = currentWidgets.filter(
          w => w.dashboardType === dashboardType
        );

        // If widgets exist and not forcing reset, just switch
        if (existingDashboardWidgets.length > 0 && !force) {
          set({
            currentDashboardType: dashboardType,
            isTemplateDialogOpen: false,
          });
          return;
        }

        const timestamp = Date.now();
        const rand = Math.floor(Math.random() * 1000000);

        // Create new widgets for this template
        const newTemplateWidgets = template.widgets.map((w, index) => ({
          ...w,
          id: `widget-${timestamp}-${index}-${rand}`,
          createdAt: timestamp,
          dashboardType: dashboardType,
        } as WidgetConfig));

        set((state) => {
          // Remove ALL existing widgets for this specific dashboard type to prevent duplicates
          const otherWidgets = state.widgets.filter(w => w.dashboardType !== dashboardType);

          return {
            widgets: [...otherWidgets, ...newTemplateWidgets],
            widgetData: {}, // Reset cache for fresh start
            isTemplateDialogOpen: false,
            currentDashboardType: dashboardType,
          };
        });
      },

      // UI Actions
      setAddWidgetOpen: (open) => set({ isAddWidgetOpen: open }),
      setTemplateDialogOpen: (open) => set({ isTemplateDialogOpen: open }),
      setEditingWidget: (widget) => set({ editingWidget: widget }),
      setCurrentDashboardType: (type) => set({ currentDashboardType: type }),

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
          return { theme: newTheme };
        });
      },

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },

      // Reset dashboard to its initial template state
      resetDashboard: () => {
        const type = get().currentDashboardType;
        const template = DASHBOARD_TEMPLATES.find((t) => t.id === type);

        if (template) {
          get().loadTemplate(template, true);
        } else {
          set((state) => ({
            widgets: state.widgets.filter(w => w.dashboardType && w.dashboardType !== type),
            widgetData: {},
          }));
        }
      },
    }),
    {
      name: STORAGE_KEYS.dashboard,
      partialize: (state) => ({
        widgets: state.widgets,
        layouts: state.layouts,
        theme: state.theme,
        watchlist: state.watchlist,
        currentDashboardType: state.currentDashboardType,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydration
        if (state?.theme) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark');
        }
      },
    }
  )
);
