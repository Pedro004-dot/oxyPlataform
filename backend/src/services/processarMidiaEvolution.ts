// src/services/processarMidiaEvolution.ts

import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL    = process.env.SUPABASE_URL!;
const SUPABASE_KEY    = process.env.SUPABASE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET!;

if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_BUCKET) {
  throw new Error('Variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_BUCKET precisam estar definidas');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Baixa a mídia de uma URL (Evolution) e faz upload para o Supabase,
 * retornando a URL pública final.
 *
 * @param remoteUrl URL fornecida pela Evolution (audio, image, video ou documento)
 * @param pasta     Nome da pasta fixa (ex: audio, documento, imagem, video)
 * @param idMsg     ID da mensagem (para gerar nome único)
 */
export async function processarMidiaEvolution(
  remoteUrl: string,
  pasta: 'audio' | 'documento' | 'imagem' | 'video',
  idMsg: string
): Promise<string> {
  // 1) Baixar o conteúdo
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar mídia: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type')!;
  const arrayBuf    = await res.arrayBuffer();
  const buffer      = Buffer.from(arrayBuf);

  // 2) Definir extensão e nome de arquivo
  const ext      = contentType.split('/')[1].split(';')[0] || 'bin';
  const filename = `${idMsg}_${Date.now()}.${ext}`;
  const destination = `whatsapp/${pasta}/${filename}`;

  // 3) Fazer upload para Supabase
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from(SUPABASE_BUCKET)
    .upload(destination, buffer, { contentType });

  if (uploadError) {
    throw new Error(`Erro no upload Supabase: ${uploadError.message}`);
  }

  // 4) Gerar URL pública
  const {
    data: { publicUrl }
  } = supabase
    .storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(uploadData.path);

  return publicUrl;
}