import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { loadCurrentUser } from "@/features/auth/server/load-current-user";
import { CurrentUserProvider } from "@/features/auth/context/current-user-context";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "LMS",
  description: "경량 LMS 웹 앱",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await loadCurrentUser();

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <Providers>
          <CurrentUserProvider initialState={currentUser}>
            <AppHeader />
            {children}
          </CurrentUserProvider>
        </Providers>
      </body>
    </html>
  );
}
