import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { themeScript } from "@/components/theme-select";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Belo Ramo CRM", template: "%s · Belo Ramo CRM" },
  description: "Protótipo do CRM escolar (dados fictícios).",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme é definido pelo script antes da hidratação.
    <html lang="pt-BR" className={`${figtree.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
