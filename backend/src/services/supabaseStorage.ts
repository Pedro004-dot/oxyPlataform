// src/services/supabaseStorage.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const BUCKET_NAME  = process.env.SUPABASE_BUCKET!;

if (!SUPABASE_URL || !SUPABASE_KEY || !BUCKET_NAME) {
  throw new Error('Variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_BUCKET devem estar configuradas');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Baixa um recurso remoto e faz upload para o bucket no Supabase.
 * @param remoteUrl URL fornecida pela Evolution API
 * @param destinationPath caminho/chave dentro do bucket (ex: `media/<clinicaId>/<filename>`)
 * @returns URL pública do arquivo enviado
 */


// src/services/supabaseStorage.ts
export async function uploadMediaToSupabase(
    remoteUrl: string,
    destinationPath: string
  ): Promise<string> {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error(`Falha ao baixar mídia: ${res.status}`);
    
    // 1) Pegue o Content-Type real
    const contentType = res.headers.get('content-type')!;
    // ex: 'image/png' → ext = 'png'
    const ext = contentType.split('/')[1].split(';')[0];
  
    const arrayBuf = await res.arrayBuffer();
    const buffer   = Buffer.from(arrayBuf);
  
    // Se você recebe destinationPath sem extensão, acrescente aqui:
    const finalPath =
      destinationPath.includes(`.${ext}`)
        ? destinationPath
        : `${destinationPath}.${ext}`;
  
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(finalPath, buffer, {
        contentType
      });
    if (error) throw error;
    const {
        data: { publicUrl }
      } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);
      
      return publicUrl;
  }