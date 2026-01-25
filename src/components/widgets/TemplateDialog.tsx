/**
 * Template Dialog Component
 * Displays available dashboard templates for quick setup
 */

import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, TrendingUp, Bitcoin, Layout, IndianRupee } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { DASHBOARD_TEMPLATES } from '@/lib/constants';
import type { DashboardTemplate } from '@/types/widget';
import { useToast } from '@/hooks/use-toast';

const iconMap: Record<string, React.ReactNode> = {
  rocket: <Rocket className="h-6 w-6" />,
  'trending-up': <TrendingUp className="h-6 w-6" />,
  bitcoin: <Bitcoin className="h-6 w-6" />,
  'indian-rupee': <IndianRupee className="h-6 w-6" />,
};

export function TemplateDialog() {
  const { isTemplateDialogOpen, setTemplateDialogOpen, loadTemplate, widgets, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  const handleSelectTemplate = (template: DashboardTemplate) => {
    loadTemplate(template);
    toast({
      title: 'Template Loaded',
      description: `${template.name} has been applied to your dashboard.`,
    });
  };

  return (
    <Dialog open={isTemplateDialogOpen} onOpenChange={setTemplateDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            Dashboard Templates
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built template to get started quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 py-4">
          {DASHBOARD_TEMPLATES.map((template) => {
            const dashboardType = template.id;
            const currentWidgets = widgets.filter(w => w.dashboardType === dashboardType);
            const isActive = currentDashboardType === dashboardType;
            const hasData = currentWidgets.length > 0;

            return (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectTemplate(template)}
                className={`flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all ${isActive
                  ? 'border-primary bg-primary/10 shadow-glow'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
                  }`}
              >
                <div className={`rounded-lg p-3 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  {iconMap[template.icon] || <Layout className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground flex items-center justify-center gap-2">
                    {template.name}
                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.description}</p>

                  <div className="mt-4 flex flex-col gap-1">
                    <p className={`text-xs font-medium ${hasData ? 'text-primary' : 'text-muted-foreground'}`}>
                      {hasData ? `${currentWidgets.length} active widget${currentWidgets.length !== 1 ? 's' : ''}` : 'Empty dashboard'}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">
                      Template adds {template.widgets.length} items
                    </p>
                  </div>

                  <div className="mt-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${hasData ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                      {hasData ? (isActive ? 'Currently Viewing' : 'Switch To') : 'Apply Template'}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
