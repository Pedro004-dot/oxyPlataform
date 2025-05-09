// src/components/ConversationCard.tsx
import { ConversationPreview } from '../../types';

interface Props {
  data: ConversationPreview;
  active: boolean;
  onClick: () => void;
}

export default function ConversationCard({ data, active, onClick }: Props) {
  // Format last update time
  const formattedTime = new Date(data.atualizadaEm).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
        active ? 'bg-gray-800' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium truncate">
          {data.nomePaciente || `Conversa #${data.id}`}
        </h3>
        <span className="text-xs text-gray-400">{formattedTime}</span>
      </div>
      
      <p className="text-sm text-gray-400 truncate">
        {data.ultimaMensagem || 'Nenhuma mensagem'}
      </p>
    </div>
  );
}