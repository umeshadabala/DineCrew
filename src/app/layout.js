import "./globals.css";
import MobileTouchHandler from '@/components/MobileTouchHandler';

export const metadata = {
  title: "DineCrew — Tipping & Feedback Platform",
  description:
    "Manage your restaurant staff, collect guest feedback, process tips seamlessly, and connect with hospitality talent — all in one platform.",
  keywords: ["restaurant", "hospitality", "tipping", "staff management", "hiring", "QR code"],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DineCrew',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MobileTouchHandler>{children}</MobileTouchHandler>
      </body>
    </html>
  );
}
