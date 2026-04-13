import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2025 Masters Calcutta",
  description: "Private group Masters golf Calcutta tournament dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        {/* Full-viewport background — different image on mobile vs desktop */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10 md:hidden"
          style={{
            backgroundImage: "url('https://i.redd.it/45k04ez8hqme1.jpeg')",
          }}
        />
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10 hidden md:block"
          style={{
            backgroundImage:
              "url('https://www.sportsvideo.org/wp-content/uploads/2016/03/golf_course_green_946x432.jpg')",
          }}
        />
        {/* Dark overlay */}
        <div
          className="fixed inset-0 -z-10"
          style={{ background: "rgba(0,0,0,0.65)" }}
        />
        {children}
      </body>
    </html>
  );
}
