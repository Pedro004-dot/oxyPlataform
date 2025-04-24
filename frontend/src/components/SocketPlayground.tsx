import React, { useEffect, useRef, useState } from 'react';
import { connectSocket, ChatSocket } from '../hook/useSocket';
const CONV_ID  = Number(import.meta.env.VITE_TEST_CONV);
export default function SocketPlayground() {
  const JWT = import.meta.env.VITE_TEST_JWT as string;
  const DEFAULT_CONV = Number(import.meta.env.VITE_TEST_CONV);

  const socketRef = useRef<ChatSocket | null>(null);
  const [convId, setConvId] = useState<number>(DEFAULT_CONV);
  const [text, setText] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // Helper para adicionar logs
  const addLog = (l: string) => 
    setLogs((p) => [...p, `${new Date().toLocaleTimeString()}  ${l}`]);

  // Conectar socket uma vez
  useEffect(() => {
    const sock = connectSocket(JWT);
    
    socketRef.current = sock;

    sock.on('connect', () => addLog(`✅ conectado id=${sock.id}`));
    sock.emit('conversation:join', CONV_ID, console.log);
    sock.emit(
      'conversation:history',
      { conversationId: CONV_ID, limit: 20 },
      (resp: any) => console.log('hist', resp)
    );
    /* escuta push */
    sock.on('message:new',  (m: any) => console.log('push new', m));
    sock.on('message:status', (s: any) => console.log('push status', s));
    

    return () => {
      sock.disconnect();
    };
  }, [JWT]);

  // Join / Leave
  const join = () =>
    socketRef.current?.emit(
      'join_conversation',
      convId,
      (resp: { success: boolean; error?: string }) =>
        addLog(
          resp.success ? '🟢 joined!' : `⚠️ join error ${resp.error}`
        )
    );

  const leave = () =>
    socketRef.current?.emit('leave_conversation', convId);

  // Load history
  const load = () =>
    socketRef.current?.emit(
      'load_history',
      { conversationId: convId, limit: 10 },
      (resp: { success: boolean; error?: string; data?: any[] }) =>
        addLog(
          resp.success
            ? `📜 history (${resp.data?.length}) msgs`
            : `⚠️ hist err ${resp.error}`
        )
    );

    const ackFn = (resp: { success: boolean; error?: string; msg?: any }) => {
      if (resp.success) {
        addLog('➡️ sent ok');
      } else {
        addLog(`⚠️ send err ${resp.error}`);
      }
    };
  // Send message
    
  const send = () => {
    if (!text.trim()) return;
    socketRef.current?.emit(
      'message:send',
      { conversationId: convId, content: text },
      ackFn,   // 🟢 agora existe
    );
    setText('');
  };
  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Socket Playground</h1>

      <div className="flex gap-2">
        <input
          type="number"
          value={convId}
          onChange={(e) => setConvId(Number(e.target.value))}
          className="border p-1 w-32"
        />
        <button onClick={join} className={btn}>join</button>
        <button onClick={leave} className={btn}>leave</button>
        <button onClick={load} className={btn}>history</button>
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="border flex-1 p-1"
          placeholder="mensagem..."
        />
        <button onClick={send} className={btn}>enviar</button>
      </div>

      <pre className="bg-black text-green-300 p-3 h-64 overflow-y-auto text-xs">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </pre>
    </div>
  );
}

const btn =
  'px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
