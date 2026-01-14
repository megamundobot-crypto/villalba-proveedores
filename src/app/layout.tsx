import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import ChatButton from "@/components/ChatButton";
import ChatPanel from "@/components/ChatPanel";

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
        <AuthProvider>
          <ChatProvider>
            {children}
            <ChatButton />
            <ChatPanel />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
