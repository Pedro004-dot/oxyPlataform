import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export async function saveMediaFromUrl(url: string, clinicId: number, convId: number, fileName: string) {
  const resp = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  const ext = path.extname(url.split('?')[0]) || '.bin';
  const dir = path.resolve('public', 'uploads', `clinic_${clinicId}`, `conv_${convId}`);
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, fileName + ext);
  await fs.writeFile(fullPath, Buffer.from(resp.data));
  return `/uploads/clinic_${clinicId}/conv_${convId}/${fileName + ext}`; // URL estática
}