import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { useServerFn } from "@tanstack/react-start";
import { generateInsights } from "@/lib/insights.functions";
import { Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

const PRESETS = [
  "قدّم تحليلاً شاملاً لأداء الأسطول وتوصيات عملية للتحسين.",
  "ما هي أكبر 3 فرص لخفض التكاليف؟",
  "كيف يمكن تحسين معدل استغلال الشاحنات؟",
  "ما مؤشرات الخطر الحالية في العمليات؟",
  "حلّل ربحية الشركة وقدّم توقعات للشهر القادم.",
];

function InsightsPage() {
  const runAI = useServerFn(generateInsights);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const ask = async (question?: string) => {
    const finalQ = question ?? q;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await runAI({ data: { question: finalQ } });
      setAnswer(res.answer);
      setSummary(res.summary);
    } catch (e: any) {
      toast.error(e?.message ?? "فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="تحليلات ذكية (AI)"
        subtitle="ذكاء اصطناعي يحلّل بيانات شركتك ويقدّم توصيات عملية"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => ask(p)}
            disabled={loading}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent hover:bg-accent/10 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 rounded-2xl border border-border bg-card p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && ask()}
          placeholder="اسأل أي سؤال عن أداء شركتك..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => ask()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          تحليل
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
          <div className="mt-3 text-sm text-muted-foreground">الذكاء الاصطناعي يحلّل بياناتك...</div>
        </div>
      )}

      {answer && !loading && (
        <>
          <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/5 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <div className="font-bold">التحليل والتوصيات</div>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
          </div>
          {summary && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 text-xs font-bold uppercase text-muted-foreground">البيانات المُحلّلة</div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                {Object.entries(summary).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-bold">{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!answer && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent" />
          <div className="mt-3 font-bold">اطرح سؤالاً أو اختر تحليلاً جاهزاً</div>
          <div className="mt-1 text-sm text-muted-foreground">سيقوم الذكاء الاصطناعي بتحليل بيانات شركتك الفعلية.</div>
        </div>
      )}
    </>
  );
}
