import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/app/trips")({
  component: () => (
    <ModulePage
      title="إدارة الرحلات"
      subtitle="رقم الرحلة، الشاحنة، السائق، العميل، المسافة، التكلفة، الإيرادات، الربح"
      icon={RouteIcon}
      emptyTitle="ابدأ بإنشاء رحلاتك"
      emptyDesc="سيتم عرض جميع الرحلات مع حساب المسافة، مدة الرحلة، التكلفة والربحية لكل رحلة."
      stats={[
        { label: "رحلة نشطة", value: "34", tint: "bg-accent/10 text-accent" },
        { label: "مكتملة اليوم", value: "18", tint: "bg-success/10 text-success" },
        { label: "متوسط المسافة", value: "412km" },
        { label: "إيرادات اليوم", value: "24K MAD" },
      ]}
    />
  ),
});
