import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Minecraft Basketball Association",
  description: "Official website of the Minecraft Basketball Association - The Most Competitive Minecraft basketball league",
  icons: {
    icon: '/logo.png',
  },
  metadataBase: new URL('https://minecraftbasketball.com'),
  openGraph: {
    title: "Minecraft Basketball Association",
    description: "Official website of the Minecraft Basketball Association - The Most Competitive Minecraft basketball league",
    url: 'https://minecraftbasketball.com',
    siteName: 'Minecraft Basketball Association',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://minecraftbasketball.com/logo.png',
        width: 512,
        height: 512,
        alt: 'Minecraft Basketball Association Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: "Minecraft Basketball Association",
    description: "Official website of the Minecraft Basketball Association - Premier Minecraft basketball league",
    images: ['https://minecraftbasketball.com/logo.png'],
  },
  themeColor: '#2563EB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Navigation />
            <main className="min-h-screen">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

