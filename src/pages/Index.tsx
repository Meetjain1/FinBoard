/**
 * FinBoard - Customizable Finance Dashboard
 * Main Dashboard Page Component
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { AddWidgetDialog } from '@/components/widgets/AddWidgetDialog';
import { EditWidgetDialog } from '@/components/widgets/EditWidgetDialog';
import { TemplateDialog } from '@/components/widgets/TemplateDialog';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { setTheme, widgets, reorderWidgets } = useDashboardStore();
  const { toast } = useToast();

  // Initialize theme on mount
  useEffect(() => {
    // Check for stored preference or system preference
    const storedTheme = localStorage.getItem('finboard-dashboard');
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        if (parsed.state?.theme) {
          setTheme(parsed.state.theme);
        }
      } catch {
        // Ignore parse errors
      }
    } else {
      // Default to dark theme for finance apps
      setTheme('dark');
    }
  }, [setTheme]);

  // Sanitize widgets on mount (fix duplicate keys bug)
  useEffect(() => {
    if (widgets.length > 0) {
      const seenIds = new Set();
      const uniqueWidgets = widgets.filter((w) => {
        if (seenIds.has(w.id)) return false;
        seenIds.add(w.id);
        return true;
      });

      if (uniqueWidgets.length !== widgets.length) {
        console.warn(`Cleaned up ${widgets.length - uniqueWidgets.length} duplicate widgets`);
        reorderWidgets(uniqueWidgets);
      }
    }
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DashboardGrid />
        </motion.div>
      </main>

      {/* Dialogs */}
      <AddWidgetDialog />
      <EditWidgetDialog />
      <TemplateDialog />

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Index;
