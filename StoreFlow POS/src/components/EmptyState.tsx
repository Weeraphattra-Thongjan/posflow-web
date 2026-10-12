import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, className = "", children }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center ${className}`}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {actionLabel && (actionTo || onAction) && (
        <div className="mt-4">
          {actionTo ? (
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
