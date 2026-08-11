import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Krouzky Planner',
  description:
    'Sestavte rozvrh zájmových kroužků dítěte a vyexportujte ho do kalendáře (.ics).',
};

// viewport-fit=cover je nutný, aby safe-area insety vracely nenulové hodnoty (C9-M8).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
