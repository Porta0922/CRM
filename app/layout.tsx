import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loan Management System",
  description: "Sistema de gestión de préstamos personales",
};

import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
