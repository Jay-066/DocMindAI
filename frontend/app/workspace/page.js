'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Folders, FileText, MessagesSquare, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CollectionSidebar from '@/components/CollectionSidebar';
import UploadPanel from '@/components/UploadPanel';
import ChatPanel from '@/components/ChatPanel';
import WorkspaceWelcome from '@/components/WorkspaceWelcome';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

export default function WorkspacePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null);
  const [documents, setDocuments] = useState(null); // active collection's docs, null while loading
  const [mobileTab, setMobileTab] = useState('docs'); // 'collections' | 'docs' | 'chat' below lg
  const [docsRefreshSignal, setDocsRefreshSignal] = useState(0);

  // Keeps the current selection (with fresh data) and only falls back to the first collection
  // when nothing is selected or the selected one is gone. Throws on failure.
  const loadCollections = useCallback(async () => {
    const { collections: cols } = await api.listCollections();
    setCollections(cols);
    setActiveCollection((current) => cols.find((c) => c._id === current?._id) || cols[0] || null);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadCollections()
        .catch((err) => console.error(err))
        .finally(() => setCollectionsLoaded(true));
    }
  }, [user, authLoading, router, loadCollections]);

  // Chat's Refresh button: reload the collection list and ask the documents panel to re-fetch
  const handleRefresh = useCallback(async () => {
    setDocsRefreshSignal((n) => n + 1);
    await loadCollections();
  }, [loadCollections]);

  const activeId = activeCollection?._id;

  // Keep the sidebar's document count in sync with uploads/deletes in the documents panel
  const handleDocumentsChange = useCallback(
    (docs) => {
      setDocuments(docs);
      if (!docs) return;
      setCollections((prev) =>
        prev.some((c) => c._id === activeId && c.documentCount !== docs.length)
          ? prev.map((c) => (c._id === activeId ? { ...c, documentCount: docs.length } : c))
          : prev
      );
    },
    [activeId]
  );

  function handleSelectCollection(collection) {
    setActiveCollection(collection);
    setMobileTab('docs');
  }

  async function handleCreateCollection(name, description) {
    const { collection } = await api.createCollection({ name, description });
    setCollections((prev) => [collection, ...prev]);
    setActiveCollection(collection);
    setMobileTab('docs');
  }

  async function handleDeleteCollection(id) {
    try {
      await api.deleteCollection(id);
    } catch (err) {
      alert(`Could not delete collection: ${err.message}`);
      return;
    }
    const remaining = collections.filter((c) => c._id !== id);
    setCollections(remaining);
    if (activeId === id) setActiveCollection(remaining[0] || null);
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-ink-faint text-sm">
        Loading...
      </div>
    );
  }

  const hasCollections = collections.length > 0;

  return (
    <div className="h-screen bg-base flex flex-col overflow-hidden">
      <Navbar />

      {hasCollections && (
        <div className="lg:hidden flex border-b border-border bg-surface/40" role="tablist">
          <TabButton active={mobileTab === 'collections'} onClick={() => setMobileTab('collections')} icon={Folders} label="Collections" />
          <TabButton active={mobileTab === 'docs'} onClick={() => setMobileTab('docs')} icon={FileText} label="Documents" />
          <TabButton active={mobileTab === 'chat'} onClick={() => setMobileTab('chat')} icon={MessagesSquare} label="Chat" />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <CollectionSidebar
          className={`${mobileTab === 'collections' && hasCollections ? 'flex w-full' : 'hidden'} lg:flex lg:w-64 xl:w-72`}
          collections={collections}
          activeCollection={activeCollection}
          onSelect={handleSelectCollection}
          onCreate={handleCreateCollection}
          onDelete={handleDeleteCollection}
        />

        {!collectionsLoaded ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-ink-faint text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading collections...
          </div>
        ) : !hasCollections ? (
          <WorkspaceWelcome onCreate={handleCreateCollection} />
        ) : !activeCollection ? (
          <div className="flex-1 flex items-center justify-center text-ink-faint text-sm px-6 text-center">
            Select a collection to see its documents and start asking questions.
          </div>
        ) : (
          <>
            <section
              className={`${mobileTab === 'docs' ? 'block w-full' : 'hidden'} lg:block lg:w-[22rem] xl:w-[26rem] shrink-0 border-r border-border p-5 overflow-y-auto`}
            >
              <UploadPanel
                key={activeCollection._id}
                collection={activeCollection}
                onDocumentsChange={handleDocumentsChange}
                refreshSignal={docsRefreshSignal}
              />
            </section>
            <section className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 overflow-hidden`}>
              <ChatPanel collection={activeCollection} documents={documents} onRefresh={handleRefresh} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-ink-faint'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
