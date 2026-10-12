import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";

export function SupportTicketDialog({ trigger }: { trigger?: ReactNode }) {
  const { user } = useAuth();
  const { store } = useStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      store_id: store?.id ?? null,
      subject: subject.trim(),
      message: message.trim(),
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("support.success"));
    setSubject(""); setMessage(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <LifeBuoy className="h-4 w-4" />
              {t("support.report")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("support.title")}</DialogTitle>
          <DialogDescription>
            {t("support.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">{t("support.subject")}</Label>
            <Input id="ticket-subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("support.subject_placeholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-message">{t("support.message")}</Label>
            <Textarea id="ticket-message" required maxLength={2000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("support.message_placeholder")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("support.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
