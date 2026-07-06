import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/app/maintenance")({
  component: () => (
    <ModulePage
      title="الصيانة الوقائية والتصحيحية"
      subtitle="تنبيهات حسب الكيلومترات، ساعات التشغيل والتاريخ — زيت، فلاتر، إطارات، فحص دوري"
      icon={Wrench}
      emptyTitle="جدولة الصيانة"
      emptyDesc="حدد جداول الصيانة الوقائية لكل مركبة وستصلك تنبيهات تلقائية عند اقتراب موعد الصيانة."
      stats={[
        { label: "صيانة مجدولة", value: "12", tint: "bg-warning/10 text-warning-foreground" },
        { label: "قيد التنفيذ", value: "3", tint: "bg-accent/10 text-accent" },
        { label: "متأخرة", value: "1", tint: "bg-destructive/10 text-destructive" },
        { label: "تكلفة الشهر", value: "48K MAD" },
      ]}
    />
  ),
});
