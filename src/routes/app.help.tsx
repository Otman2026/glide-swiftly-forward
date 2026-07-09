import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askHelp } from "@/lib/help.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, HelpCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/help")({
  component: HelpPage,
  head: () => ({
    meta: [{ title: "المساعدة الذكية — SAIFO ERP" }],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "كيف أضيف أمر نقل جديد؟",
  "كيف أنشئ فاتورة وأربطها بعقد؟",
  "كيف أسجّل رحلة وأربطها بسائق ومركبة؟",
  "كيف أفعّل تتبع GPS لمركبة؟",
  "كيف أضيف مستخدم جديد وأمنحه صلاحيات؟",
  "كيف أستعرض تقارير الأداء وأصدّرها PDF؟",
  "كيف أدير الصيانة الدورية للمركبات؟",
  "كيف أفعّل ترخيص جديد للمؤسسة؟",
];

function HelpPage() {
  const ask = useServerFn(askHelp);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "مرحباً 👋 أنا مساعدك الذكي في SAIFO ERP. اسألني كيف تستخدم أي وحدة أو ميزة، أو اختر سؤالاً سريعاً من الأسفل.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { answer } = await ask({ data: { messages: next.map(({ role, content }) => ({ role, content })) } });
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col gap-4 p-4" dir="rtl">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-xl font-bold">المساعدة الذكية</h1>
          <p className="text-sm text-muted-foreground">اسأل عن أي وحدة أو ميزة في التطبيق</p>
        </div>
      </div>

      <Card className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="rounded-lg bg-secondary px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </Card>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => send(q)}
              disabled={loading}
            >
              <Sparkles className="ml-1 h-3 w-3" />
              {q}
            </Button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك هنا..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
