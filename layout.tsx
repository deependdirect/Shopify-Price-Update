export const metadata = {
  title: 'Bulk Price Calculator',
  description: 'Calculate retail prices with margin protection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
