import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
});

function isSubPath(parentDir, candidatePath) {
  const relative = path.relative(parentDir, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function createStaticHandler(publicDir = DEFAULT_PUBLIC_DIR) {
  const resolvedPublicDir = path.resolve(publicDir);

  return async function staticHandler(req, res) {
    const method = req.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        Allow: 'GET, HEAD',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('405 Method Not Allowed');
      return;
    }

    let rawPathname = '/';
    try {
      const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
      rawPathname = parsedUrl.pathname;
    } catch {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('400 Bad Request');
      return;
    }

    let decodedPathname;
    try {
      decodedPathname = decodeURIComponent(rawPathname);
    } catch {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('400 Bad Request');
      return;
    }

    if (decodedPathname.includes('\0') || decodedPathname.includes('\\')) {
      res.writeHead(403, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('403 Forbidden');
      return;
    }

    const segments = decodedPathname.split('/');
    if (segments.some((segment) => segment === '..')) {
      res.writeHead(403, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('403 Forbidden');
      return;
    }

    const relativeTarget = decodedPathname === '/' ? 'index.html' : decodedPathname.replace(/^\/+/, '');
    const resolvedFilePath = path.resolve(resolvedPublicDir, relativeTarget);

    if (!isSubPath(resolvedPublicDir, resolvedFilePath)) {
      res.writeHead(403, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('403 Forbidden');
      return;
    }

    try {
      const stat = await fs.stat(resolvedFilePath);
      if (!stat.isFile()) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(resolvedFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = await fs.readFile(resolvedFilePath);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.byteLength,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache'
      });

      if (method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    } catch (err) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end('404 Not Found');
        return;
      }

      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('500 Internal Server Error');
    }
  };
}

export function createAppServer(publicDir = DEFAULT_PUBLIC_DIR) {
  return http.createServer(createStaticHandler(publicDir));
}
