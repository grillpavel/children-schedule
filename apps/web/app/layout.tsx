import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Krouzky Planner',
  description:
    'Sestavte rozvrh zájmových kroužků dítěte a vyexportujte ho do kalendáře (.ics).',
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
