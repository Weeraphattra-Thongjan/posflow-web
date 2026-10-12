import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Staff | PosFlow" }] }),
});

interface Invite { id: string; email: string; role: string; status: string; created_at: string; }

function StaffPage() {
  const { store } = useStore();
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "cashier" });

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("staff_invites").select("*")
      .eq("store_id", store.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store]);

  const save = async () => {
    if (!store || !user || !form.email.trim()) return;
    const { error } = await supabase.from("staff_invites").insert({
      store_id: store.id, email: form.email.trim().toLowerCase(),
      role: form.role as "cashier" | "owner", invited_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Invited"); setOpen(false); setForm({ email: "", role: "cashier" }); load();
  };

  const remove = async (id: string) => {
    await supabase.from("staff_invites").delete().eq("id", id);
    load();
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("staff.title")}</h1>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-1.5 h-4 w-4" /> {t("staff.invite")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t("common.empty")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("staff.email")}</th>
                <th className="px-4 py-3 text-left">{t("staff.role")}</th>
                <th className="px-4 py-3 text-left">{t("staff.status")}</th>
                <th className="px-4 py-3 text-right">{t("prod.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{i.email}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{i.role}</Badge></td>
                  <td className="px-4 py-3"><Badge>{t("staff.pending")}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("staff.invite")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("staff.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>{t("staff.role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{t("side.cashier")}</SelectItem>
                  <SelectItem value="owner">{t("side.owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
