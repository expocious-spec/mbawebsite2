import type { Metadata } from "next";
import { Pixelify_Sans } from 'next/font/google';
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

// Using Pixelify Sans as Minecraft-style font
const minecraftFont = Pixelify_Sans({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-minecraft',
  display: 'swap',
});

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
  },
  twitter: {
    card: 'summary',
    title: "Minecraft Basketball Association",
    description: "Official website of the Minecraft Basketball Association - Premier Minecraft basketball league",
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
      <body className={minecraftFont.variable}>
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

