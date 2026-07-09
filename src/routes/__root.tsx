import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "../lib/pwa";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SAIFO TRANSPORT ERP — منصة إدارة شركات النقل واللوجستيك" },
      {
        name: "description",
        content:
          "منصة SAIFO TRANSPORT ERP الاحترافية لإدارة شركات النقل واللوجستيك: TMS + FMS + CRM + KPI + إدارة الأسطول والسائقين والرحلات والفوترة.",
      },
      { name: "author", content: "SAIFO TRANSPORT" },
      { property: "og:title", content: "SAIFO TRANSPORT ERP — منصة إدارة شركات النقل واللوجستيك" },
      {
        property: "og:description",
        content: "منصة احترافية متكاملة لإدارة شركات النقل واللوجستيك المحلية والدولية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B2545" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SAIFO ERP" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { name: "twitter:title", content: "SAIFO TRANSPORT ERP — منصة إدارة شركات النقل واللوجستيك" },
      { name: "description", content: "منصة SAIFO TRANSPORT ERP الاحترافية لإدارة شركات النقل واللوجستيك: TMS + FMS + CRM + KPI + إدارة الأسطول والسائقين والرحلات والفوترة." },
      { property: "og:description", content: "منصة SAIFO TRANSPORT ERP الاحترافية لإدارة شركات النقل واللوجستيك: TMS + FMS + CRM + KPI + إدارة الأسطول والسائقين والرحلات والفوترة." },
      { name: "twitter:description", content: "منصة SAIFO TRANSPORT ERP الاحترافية لإدارة شركات النقل واللوجستيك: TMS + FMS + CRM + KPI + إدارة الأسطول والسائقين والرحلات والفوترة." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f17f7f57-5d50-4f2f-9018-709befc74455/id-preview-1e4b23db--6022ace2-8024-4a28-8eaa-13f2d183b5ee.lovable.app-1783437610346.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f17f7f57-5d50-4f2f-9018-709befc74455/id-preview-1e4b23db--6022ace2-8024-4a28-8eaa-13f2d183b5ee.lovable.app-1783437610346.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "mask-icon", href: "/icon-512.png", color: "#0B2545" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    registerServiceWorker();
    const upd = () => setOnline(navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-warning py-1.5 text-center text-xs font-bold text-warning-foreground">
          وضع دون اتصال — التغييرات ستُزامَن عند عودة الشبكة
        </div>
      )}
      <Outlet />
    </QueryClientProvider>
  );
}

