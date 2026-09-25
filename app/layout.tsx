import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locus — estudo adaptativo",
  description: "A plataforma organiza o treino certo para cada prova. Primeiro módulo completo: OAB, 2ª fase, Direito Penal.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
