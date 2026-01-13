import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Proveedores - Villalba",
  description: "Gestión de proveedores, facturas y pagos - Villalba Hermanos SRL / Villalba Cristino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-100 font-sans">
        {children}
      </body>
    </html>
  );
}
