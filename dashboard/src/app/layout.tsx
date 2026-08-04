export const metadata = {
  title: "Push Dashboard",
  description: "Self-hosted push notification dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0b0f19",
          color: "#e6e8ee",
        }}
      >
        {children}
      </body>
    </html>
  );
}
