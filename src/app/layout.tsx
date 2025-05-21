import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synapse Lite",
  description: "AI-powered research assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="">
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col`}>
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center p-4">
            <h1 className="text-2xl font-bold text-sky-600 dark:text-sky-400">Synapse Lite</h1>
            <nav className="flex space-x-1">
              <Link href="/?tab=papers" className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Papers
              </Link>
              <Link href="/?tab=digests" className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Digests
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow w-full">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
          Synapse Lite &copy; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
