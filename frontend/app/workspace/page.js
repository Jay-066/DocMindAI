'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, MessagesSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CollectionSidebar from '@/components/CollectionSidebar';
import UploadPanel from '@/components/UploadPanel';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

export default function WorkspacePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [rightTab, setRightTab] = useState('upload'); // 'upload' | 'chat' toggle on small screens

  const loadCollections = useCallback(async () => {
    try {
      const { collections: cols } = await api.listCollections();
      setCollections(cols);
      if (cols.length > 0 && !activeCollection) {
        setActiveCollection(cols[0]);
      }
    } catch (err) {
      console.error(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) loadCollections();
  }, [user, authLoading, router, loadCollections]);

  async function handleCreateCollection(name) {
    const { collection } = await api.createCollection({ name });
    setCollections((prev) => [collection, ...prev]);
    setActiveCollection(collection);
  }

  async function handleDeleteCollection(id) {
    await api.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c._id !== id));
    if (activeCollection?._id === id) setActiveCollection(null);
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-ink-faint text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-base flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <CollectionSidebar
          collections={collections}
          activeCollection={activeCollection}
          onSelect={setActiveCollection}
          onCreate={handleCreateCollection}
          onDelete={handleDeleteCollection}
        />

        {/* Mobile tab toggle */}
        <div className="lg:hidden flex border-b border-border absolute top-16 left-64 right-0 z-10 bg-base">
          <TabButton active={rightTab === 'upload'} onClick={() => setRightTab('upload')} icon={UploadCloud} label="Documents" />
          <TabButton active={rightTab === 'chat'} onClick={() => setRightTab('chat')} icon={MessagesSquare} label="Chat" />
        </div>

        <div className={`w-96 border-r border-border p-5 overflow-y-auto shrink-0 ${rightTab === 'upload' ? 'block' : 'hidden lg:block'}`}>
          <p className="eyebrow mb-4">
            {activeCollection ? `Documents — ${activeCollection.name}` : 'Documents'}
          </p>
          {activeCollection ? (
            <UploadPanel collectionId={activeCollection._id} />
          ) : (
            <p className="text-ink-faint text-sm">Select a collection to upload documents.</p>
          )}
        </div>

        <div className={`flex-1 flex overflow-hidden ${rightTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <ChatPanel collectionId={activeCollection?._id} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-ink-faint'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
