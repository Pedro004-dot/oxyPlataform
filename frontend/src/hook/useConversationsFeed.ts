
import { useEffect } from 'react';
import { ChatSocket } from './useSocket';
import { ConversationPreview } from '../types';

export function useConversationsFeed(
  socket: ChatSocket | null,
  onNewConversation: (conversation: ConversationPreview) => void
) {
  useEffect(() => {
    if (!socket) return;

    // Join the feed room
    socket.emit('feed:join', (resp: any) => {
      if (!resp.success) {
        console.error('Failed to join feed:', resp.error);
      }
    });

    // Listen for new conversations
    const handleNewConversation = (conversation: ConversationPreview) => {
      onNewConversation(conversation);
    };

    socket.on('conversation:list', handleNewConversation);

    return () => {
      socket.off('conversation:list', handleNewConversation);
    };
  }, [socket, onNewConversation]);
}