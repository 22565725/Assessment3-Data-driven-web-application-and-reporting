import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/siteConfig";
import Header from "@/Components/layout/Header";
import Footer from "@/Components/layout/Footer";
import { ThemeProvider } from "@/Components/theme/ThemeProvider";
import Breadcrumbs from "@/Components/navigation/Breadcrumbs";
import { cookies, headers } from "next/headers";
import { API_PORT, RSS_PATH } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Built per-request rather than as a static object, because of the RSS
 * autodiscovery link.
 *
 * That tag is how a browser extension or feed reader finds the feed from
 * any page of the site, so its href has to be an absolute URL. The address
 * is not knowable at build time - the Learner Lab reassigns the public IP
 * on every restart - so it is derived from the Host header of the request
 * being served, the server-side equivalent of what resolveApiUrl does with
 * window.location in the browser.
 */
export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();

  // Host carries "name:port"; the feed is on the API port, not this one.
  const host = headerList.get("host") ?? "localhost";
  const hostname = host.split(":")[0];
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const rssUrl = protocol + "://" + hostname + ":" + API_PORT + RSS_PATH;

  return {
    title: siteConfig.assessmentTitle,
    description: siteConfig.description,
    alternates: {
      types: {
        "application/rss+xml": [
          { url: rssUrl, title: siteConfig.shortTitle + " — all posts" },
        ],
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read on the server, so the correct theme is in the very first byte of HTML.
  // Anyone can edit a cookie, so treat only "dark" as valid and fall back to light.
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>
          <Header />
          <Breadcrumbs />
          <div className="mx-auto w-full max-w-5xl flex-1 p-4">
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
