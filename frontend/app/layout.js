import './globals.css';

export const metadata = {
  title: 'Stasiun Cuaca',
  description: 'Weather station monitoring dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
