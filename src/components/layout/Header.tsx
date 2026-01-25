/**
 * Dashboard Header Component
 * Contains logo, theme toggle, and dashboard actions
 */

import { motion } from 'framer-motion';
import { Moon, Sun, Plus, Download, Upload, RotateCcw, TrendingUp, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { theme, toggleTheme, setAddWidgetOpen, setTemplateDialogOpen, exportDashboard, importDashboard, resetDashboard, widgets, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  // Filter widgets by current dashboard type
  const filteredWidgets = widgets.filter(
    (w) => !w.dashboardType || w.dashboardType === currentDashboardType
  );
  const activeWidgetCount = filteredWidgets.length;

  const handleExport = () => {
    const data = exportDashboard();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finboard-dashboard-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Dashboard Exported',
      description: 'Your dashboard configuration has been downloaded.',
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const success = importDashboard(text);
        if (success) {
          toast({
            title: 'Dashboard Imported',
            description: 'Your dashboard has been restored from the file.',
          });
        } else {
          toast({
            title: 'Import Failed',
            description: 'Invalid dashboard configuration file.',
            variant: 'destructive',
          });
        }
      }
    };
    input.click();
  };

  const handleReset = () => {
    resetDashboard();
    toast({
      title: 'Dashboard Restored',
      description: `The ${currentDashboardType.replace('-', ' ')} dashboard has been reset to its original template.`,
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight gradient-text">FinBoard</h1>
            <span className="text-xs text-muted-foreground">Finance Dashboard</span>
          </div>
        </motion.div>

        {/* Status */}
        <motion.div
          className="hidden items-center gap-2 text-sm text-muted-foreground xs:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <span className="font-medium text-foreground">{activeWidgetCount}</span>
            <span className="hidden sm:inline">Active</span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex items-center gap-1.5 sm:gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
            className="gap-1.5 px-2.5 sm:px-3"
          >
            <Layout className="h-4 w-4" />
            <span className="hidden xs:inline">Templates</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setAddWidgetOpen(true)}
            className="gap-1.5 px-2.5 sm:px-3 shadow-glow"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline text-xs sm:text-sm">Add</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <span className="sr-only">More options</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">

              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Import Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleReset} className="text-destructive focus:text-destructive">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </motion.div>
            <span className="sr-only">Toggle theme</span>
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
