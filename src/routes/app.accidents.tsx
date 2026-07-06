import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/accidents")({
  component: () => (
    <ModulePage
      title="إدارة الحوادث"
      subtitle="تاريخ الحادث، المركبة، السائق، الصور، التقارير، شركة التأمين، تكلفة الإصلاح"
      icon={AlertTriangle}
      emptyTitle="سجل الحوادث"
      emptyDesc="نظام تتبع كامل للحوادث مع رفع الصور والتقارير وربطها بشركة التأمين لتسريع التعويضات."
      stats={[
        { label: "حوادث الشهر", value: "0", tint: "bg-success/10 text-success" },
        { label: "قيد المعالجة", value: "0" },
        { label: "منتظرة تأمين", value: "0" },
        { label: "معدل السلامة", value: "99.8%", tint: "bg-success/10 text-success" },
      ]}
    />
  ),
});
