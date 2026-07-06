import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { Warehouse } from "lucide-react";

export const Route = createFileRoute("/app/warehouses")({
  component: () => (
    <ModulePage
      title="إدارة المستودعات"
      subtitle="مواقع تخزين، استلام، تسليم، جرد وتحويلات بين المستودعات"
      icon={Warehouse}
      emptyTitle="أنشئ مستودعك الأول"
      emptyDesc="نظام متكامل لإدارة المستودعات مع تتبع المواقع والحركات والجرد الدوري."
      stats={[
        { label: "المستودعات", value: "0" },
        { label: "نسبة الإشغال", value: "-" },
        { label: "حركات اليوم", value: "0" },
        { label: "تحويلات جارية", value: "0" },
      ]}
    />
  ),
});
