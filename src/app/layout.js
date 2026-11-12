import { Inter } from "next/font/google";
import IntroSplash from "@/components/IntroSplash";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Yenoh Desk",
  description: "Yenoh's internal desk for tasks, team and attendance.",
  robots: { index: false, follow: false },
};

// Runs before the page paints: show the intro on the first open in this tab, skip it afterwards.
const INTRO_CHECK = `try{document.documentElement.dataset.intro=sessionStorage.getItem('yd-intro')?'done':'show'}catch(e){document.documentElement.dataset.intro='show'}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_CHECK }} />
        <noscript>
          <style>{".splash{display:none!important}"}</style>
        </noscript>
        {/* Satoshi headings font, same as yenoh.in. Connecting early makes it load sooner. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap" />
      </head>
      <body>
        <IntroSplash />
        {children}
      </body>
    </html>
  );
}
