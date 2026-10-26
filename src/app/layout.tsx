import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tripo AI — Create 3D Models from Image and Text in Seconds | Tripo Studio',
  description:
    'Generate high-detail and smart quad-topology 3D models from images, text, or multi-view inputs with AI segmentation, 8K PBR texturing, and auto-rigging.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070709] text-slate-100 antialiased selection:bg-[#f5c518] selection:text-black">
        {children}
      </body>
    </html>
  );
}
