import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { Fuel } from "lucide-react";

export const Route = createFileRoute("/app/fuel")({
  component: () => (
    <ModulePage
      title="إدارة الوقود"
      subtitle="التعبئة، الاستهلاك، التكلفة، متوسط اللتر/100km، مقارنة السائقين والشاحنات"
      icon={Fuel}
      emptyTitle="سجل تعبئات الوقود"
      emptyDesc="أضف تعبئات الوقود لبدء حساب استهلاك كل شاحنة وكل سائق وتكلفة الكيلومتر."
      stats={[
        { label: "استهلاك الشهر", value: "12,400L" },
        { label: "متوسط L/100km", value: "12.4", tint: "bg-success/10 text-success" },
        { label: "تكلفة الشهر", value: "156K MAD" },
        { label: "تكلفة الكم", value: "0.62 MAD" },
      ]}
    />
  ),
});
