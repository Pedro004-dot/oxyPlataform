import { useEffect, useState, useRef, FormEvent } from 'react';
import { fetchHistory } from '../../api/chat'; // Importando a função fetchHistory
import { ChatSocket } from '../../hook/useSocket';

interface Message {
  id: number;
  content: string;
  sentAt: string;
  sender: 'user' | 'agent';
  status?: string;
  senderName?: string;
}

interface ChatWindowProps {
  conversationId: number;
  socket: ChatSocket | null;
  onClose: () => void;
  jwt: string; // Adicionando JWT como props
}

export default function ChatWindow({ conversationId, socket, onClose, jwt }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join the conversation room and load message history using HTTP
  useEffect(() => {
    if (!socket || !conversationId || !jwt) return;

    setLoading(true);
    setError(undefined);
    setMessages([]);

    fetchHistory(jwt, conversationId)
    .then((data) => {
      console.log('Histórico de mensagens recebido:', data);
  
      if (!Array.isArray(data)) {
        throw new Error('Formato inesperado: fetchHistory não retornou array');
      }
  
      setMessages(data.map(msg => ({
        id: msg.id,
        content: msg.conteudo,
        sentAt: msg.criadaEm,
        sender: msg.remetente === 'paciente' ? 'user' : 'agent',
        status: msg.status,
        senderName: msg.remetente
      })));
      setLoading(false);
    })

    // Listen for new messages
    const handleNewMessage = (payload: Message) => {
      setMessages((prev) => [...prev, payload]);
    };

    // Listen for message status updates
    const handleMessageStatus = (payload: { id: number; status: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.id ? { ...msg, status: payload.status } : msg
        )
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleMessageStatus);

    // Cleanup function
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleMessageStatus);
      socket.emit('leave_conversation', conversationId);
    };
  }, [socket, conversationId, jwt]);

  // Send a new message
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit(
      'message:send',
      { conversationId, content: newMessage.trim() },
      (resp: any) => {
        if (!resp.success) {
          setError(`Erro ao enviar mensagem: ${resp.error}`);
        }
        // Clear input after sending
        setNewMessage('');
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 flex-grow">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Conversa #{conversationId}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          Fechar
        </button>
      </div>

      {/* Messages container */}
      <div className="flex-grow overflow-y-auto p-4">
        {loading && <div className="flex justify-center p-4">Carregando mensagens...</div>}
        {error && <div className="bg-red-900/30 p-3 rounded-md text-red-300 text-sm mb-4">{error}</div>}
        {!loading && messages.length === 0 && (
          <div className="flex justify-center p-4">Nenhuma mensagem encontrada</div>
        )}
        {messages.map((message) => (
          <div key={`${message.id}-${message.senderName}`} className={`mb-4 ${message.sender === 'agent' ? 'ml-auto text-right' : ''}`}>
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                message.sender === 'agent' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-700 text-white rounded-tl-none'
              }`}
            >
              {message.content}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(message.sentAt).toLocaleTimeString()}
              {message.status && ` • ${message.status}`}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-grow bg-gray-700 text-white rounded-l-md px-4 py-2 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-r-md disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}