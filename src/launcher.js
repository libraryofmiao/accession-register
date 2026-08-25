import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'server.js');
const runtimePath = path.join(here, '.server-runtime.mjs');
const source = await fs.readFile(sourcePath, 'utf8');

const imports = [
  'import { createVerificationRouter } from "./routes/verification.js";',
  'import { createEnhancementRouter } from "./routes/enhancements.js";'
].join('\n');
const mounts = [
  'app.use("/api/admin/verification",requireStaff,createVerificationRouter(supabaseAdmin));',
  'app.use("/api/admin/enhancements",requireStaff,createEnhancementRouter(supabaseAdmin));'
].join('\n');

if (source.includes('createVerificationRouter')) {
  throw new Error('server.js already contains verification route integration; launcher is not needed for this route.');
}

const marker = 'app.listen(PORT,()=>console.log(`Accession Register running on port ${PORT}`));';
if (!source.includes(marker)) {
  throw new Error('Unable to find server startup marker in server.js. Refusing to start a transformed server.');
}

const transformed = `${imports}\n${source.replace(marker, `${mounts}\n${marker}`)}`;
await fs.writeFile(runtimePath, transformed, 'utf8');

try {
  await import(pathToFileURL(runtimePath).href + `?v=${Date.now()}`);
} finally {
  // Keep the runtime file while the process is running; it is overwritten safely on the next start.
}
