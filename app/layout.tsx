import type { Metadata } from "next"
import { IBM_Plex_Serif, Mona_Sans } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

// @ts-ignore
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import Navbar from "@/components/Navbar"

const ibmPlexSerif = IBM_Plex_Serif({
    variable: "--font-ibm-plex-serif",
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap'
})

const monaSans = Mona_Sans({
    variable: '--font-mona-sans',
    subsets: ['latin'],
    display: 'swap'
})

export const metadata: Metadata = {
    title: "Bookified",
    description: "Transform your books into interactive AI conversations. Upload PDFs, and chat with your books using voice.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body
                    className={`${ibmPlexSerif.variable} ${monaSans.variable} antialiased relative font-sans`}
                >
                    <Navbar />
                    {children}
                    <Toaster />
                </body>
            </html>
        </ClerkProvider>
    )
}
