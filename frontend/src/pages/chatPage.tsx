// src/pages/chatPage.tsx
import { useState } from 'react';
import ConversationsList from '../components/ConversationsList';
import ChatWindow from '../components/chatWindow';
import { connectSocket } from '../hook/useSocket';

export default function ChatPage() {
  const jwt = import.meta.env.VITE_TEST_JWT as string;
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const socket = connectSocket(jwt);

  return (
    <div className="h-screen flex text-white">
      <ConversationsList
        jwt={jwt}
        activeId={activeConv ?? undefined}
        onSelect={setActiveConv}
        socket={socket}
      />
      
      {activeConv ? (
        <ChatWindow 
          jwt={jwt}
          conversationId={activeConv} 
          socket={socket} 
          onClose={() => setActiveConv(null)} 
        />
      ) : (
        <div className="flex-grow flex items-center justify-center bg-gray-800">
          <div className="text-gray-400 text-center">
            <p className="text-xl mb-2">Selecione uma conversa</p>
            <p className="text-sm">Clique em uma conversa para iniciar o chat</p>
          </div>
        </div>
      )}
    </div>
  );
}