import './globals.css';
import { AuthProvider } from '@/lib/authContext';

export const metadata = {
  title: 'DocMind AI — Search Your Documents Intelligently',
  description:
    'Production-grade multimodal RAG with hybrid retrieval, cross-encoder reranking, citation enforcement, and CI-gated evaluation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
