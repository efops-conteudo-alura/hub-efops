import type { Metadata } from "next";
import { Roboto_Flex, JetBrains_Mono, Encode_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const encodeSans = Encode_Sans({
  variable: "--font-encode-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hub de Eficiência Operacional",
  description: "Plataforma de Eficiência Operacional do time de Conteúdo da Alura.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${robotoFlex.variable} ${jetbrainsMono.variable} ${encodeSans.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
