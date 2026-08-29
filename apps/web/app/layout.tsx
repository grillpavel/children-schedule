import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// `latin-ext` nese českou diakritiku (č/ř/š/ě/ů…) — bez ní by Inter tichozáněl
// jen ASCII znaky (FR-W1-6, design_review_73.md). Dřív byl `font-family: Inter`
// v globals.css deklarovaný, ale font se nikde reálně nenačítal (appka běžela na
// systémovém fontu bez ohledu na deklaraci).
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rozvrhni',
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
    <html lang="cs" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
