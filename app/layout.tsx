import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agenda de Salas",
  description: "Sistema de reservas de salas de juntas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
