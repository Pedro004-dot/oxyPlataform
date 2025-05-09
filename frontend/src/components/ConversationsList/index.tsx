import { useEffect, useRef, useState } from 'react';
import ConversationCard from './ConversationCard';
import { ConversationPreview } from '../../types';
import { fetchConversations } from '../../api/chat';
import { ChatSocket, connectSocket } from '../../hook/useSocket';
import { useConversationsFeed } from '../../hook/useConversationsFeed';

interface Props {
  jwt: string;
  onSelect: (id: number) => void;
  activeId?: number;
  socket: ChatSocket | null;
}

export default function ConversationsList({ jwt, activeId, onSelect ,socket}: Props) {
  const [conversas, setConversas] = useState<ConversationPreview[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<ChatSocket | null>(null);
  const [list, setList] = useState<ConversationPreview[]>([]);

  // Atualizar a lista com a ordem correta
  const updateConversations = (newConversations: ConversationPreview[]) => {
    setConversas(prev => {
      const updated = [...prev, ...newConversations];
      return updated.sort((a, b) => new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime());
    });
  };
  

  // Carregar conversas via HTTP
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    fetchConversations(jwt)
      .then(list => {
        if (!cancelled) {
          if (Array.isArray(list)) {
            updateConversations(list);
            console.log('Conversas carregadas do HTTP:', list);
          } else {
            console.error('Resposta inválida:', list);
            setError('Formato de dados inválido');
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Erro ao carregar conversas:', err);
          setError(err.message || 'Erro ao carregar conversas');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [jwt]);

  /* 2. escuta push para inserir / mover */
  useConversationsFeed(socket, conv => {
    console.log('Nova conversa recebida pelo WebSocket:', conv);
    updateConversations([conv]); // Atualizar lista com a nova conversa
  });

  /* 3. render */
  return (
    <aside className="w-80 border-r border-gray-800 bg-gray-900 h-full overflow-y-auto">
      {loading && (
        <div className="p-4 text-gray-400 text-sm">Carregando...</div>
      )}
      {error && (
        <p className="p-4 text-red-400 text-sm">Erro: {error}</p>
      )}
      {!loading && !error && Array.isArray(conversas) && conversas.length === 0 && (
        <p className="p-4 text-gray-400 text-sm">Nenhuma conversa encontrada</p>
      )}
      {!loading && !error && Array.isArray(conversas) && conversas.map((c) => (
        <ConversationCard
          key={`${c.id}-${c.nomePaciente}`} 
          data={c}
          active={c.id === activeId}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </aside>
  );
}