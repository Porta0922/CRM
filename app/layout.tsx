import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loan Management System",
  description: "Sistema de gestión de préstamos personales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
