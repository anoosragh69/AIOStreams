import { setTimeout as sleep } from 'node:timers/promises';
import { fetch, type RequestInit } from 'undici';
import parseTorrent from 'parse-torrent';
import {
  DebridError,
  type DebridDownload,
  type DebridFile,
  type DebridServiceConfig,
  type PlaybackInfo,
  type TorrentDebridService,
} from './base.js';
import {
  fromUrlSafeBase64,
  type ServiceId,
} from '../utils/index.js';
import { removeDownloadOnAbort } from './utils.js';
import { appConfig } from '../utils/index.js';

interface VpsCredential {
  url: string;
  apiKey: string;
}

interface VpsFile {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  selected: boolean;
  index?: number;
}

interface VpsDownload {
  id: string;
  hash?: string;
  status: string;
  size?: number;
  files?: VpsFile[];
}

interface VpsDownloadResponse {
  download: VpsDownload;
  existing?: boolean;
}

interface VpsListResponse {
  downloads: VpsDownload[];
}

interface VpsFilesResponse {
  downloadId: string;
  files: VpsFile[];
}

export class VpsDebridService implements TorrentDebridService {
  readonly serviceName: ServiceId = 'vps';
  readonly capabilities = {
    torrents: true,
    usenet: false,
  } as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly pollingInterval: number;
  private readonly maxWaitTime: number;

  constructor(
    config: DebridServiceConfig,
    options?: {
      pollingInterval?: number;
      maxWaitTime?: number;
    }
  ) {
    const credentials = this.parseCredentials(config.token);

    this.baseUrl = credentials.url.replace(/\/$/, '');
    this.apiKey = credentials.apiKey;
    this.pollingInterval = options?.pollingInterval ?? 5000;
    this.maxWaitTime = options?.maxWaitTime ?? 120000;
  }

  private parseCredentials(token: string): VpsCredential {
    try {
      let parsed: Partial<VpsCredential>;

      // Service Wrap serializes multi-field credentials as JSON. Accept that
      // format first, then support URL-safe base64 JSON for manually supplied
      // credentials and compatibility with other service integrations.
      try {
        parsed = JSON.parse(token) as Partial<VpsCredential>;
      } catch {
        parsed = JSON.parse(
          fromUrlSafeBase64(token)
        ) as Partial<VpsCredential>;
      }

      if (!parsed.url || !parsed.apiKey) {
        throw new Error('Missing VPS URL or API key');
      }

      return {
        url: parsed.url,
        apiKey: parsed.apiKey,
      };
    } catch (error) {
      throw new DebridError(
        `Invalid VPS credentials: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 400,
          statusText: 'Bad Request',
          code: 'BAD_REQUEST',
          headers: {},
          body: null,
        }
      );
    }
  }

  private async request<T>(
    pathname: string,
    init?: RequestInit,
    signal?: RequestInit['signal']
  ): Promise<T> {
    let response: Awaited<ReturnType<typeof fetch>>;

    try {
      response = await fetch(`${this.baseUrl}${pathname}`, {
        ...init,
        signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(init?.headers ?? {}),
        },
      });
    } catch (error) {
      throw new DebridError(
        `VPS request failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 502,
          statusText: 'Bad Gateway',
          code: 'BAD_GATEWAY',
          headers: {},
          body: null,
          cause: error,
        }
      );
    }

    const text = await response.text();
    let body: unknown = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' && body !== null && 'error' in body
          ? String(body.error)
          : `VPS returned HTTP ${response.status}`;

      throw new DebridError(message, {
        statusCode: response.status,
        statusText: response.statusText,
        code: response.status === 404 ? 'NOT_FOUND' : 'BAD_GATEWAY',
        headers: Object.fromEntries(response.headers.entries()),
        body,
      });
    }

    return body as T;
  }

  private toDebridDownload(download: VpsDownload): DebridDownload {
    const status: DebridDownload['status'] = [
      'cached',
      'downloaded',
      'downloading',
      'failed',
      'invalid',
      'processing',
      'queued',
      'unknown',
      'uploading',
    ].includes(download.status)
      ? (download.status as DebridDownload['status'])
      : 'unknown';

    return {
      id: download.id,
      hash: download.hash,
      status,
      size: download.size,
      files: download.files?.map((file, index) => ({
        name: file.name,
        size: file.size,
        mimeType: file.mimeType ?? undefined,
        link: file.id,
        index: file.index ?? index,
      } satisfies DebridFile)),
    };
  }

  async checkMagnets(
    magnets: string[]
  ): Promise<DebridDownload[]> {
    const response = await this.request<{ downloads: VpsDownload[] }>(
      '/api/v1/magnets/check',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magnets }),
      }
    );

    return response.downloads.map((download) =>
      this.toDebridDownload({
        ...download,
        status:
          download.status === 'downloaded'
            ? 'cached'
            : download.status,
      })
    );
  }

  async listMagnets(): Promise<DebridDownload[]> {
    const response = await this.request<VpsListResponse>(
      '/api/v1/magnets'
    );

    return response.downloads.map((download) =>
      this.toDebridDownload(download)
    );
  }

  async addMagnet(magnet: string, requestedFileName?: string): Promise<DebridDownload> {
    const response = await this.request<VpsDownloadResponse>(
      '/api/v1/magnets',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magnet, requestedFileName }),
      }
    );

    const download = this.toDebridDownload(response.download);
    (download as DebridDownload & { existing?: boolean }).existing = response.existing ?? false;
    return download;
  }

  async addTorrent(torrentUrl: string, requestedFileName?: string): Promise<DebridDownload> {
    let torrentBuffer: Buffer;
    try {
      const response = await fetch(torrentUrl, {
        headers: { Accept: 'application/x-bittorrent' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch torrent file: HTTP ${response.status}`);
      }
      torrentBuffer = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw new DebridError(
        `Failed to download torrent file: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 502,
          statusText: 'Bad Gateway',
          code: 'BAD_GATEWAY',
          headers: {},
          body: null,
          cause: error,
        }
      );
    }

    let parsedTorrent: parseTorrent.Instance;
    try {
      parsedTorrent = parseTorrent(torrentBuffer) as parseTorrent.Instance;
    } catch (error) {
      throw new DebridError(
        `Failed to parse torrent file: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 400,
          statusText: 'Bad Request',
          code: 'BAD_REQUEST',
          headers: {},
          body: null,
          cause: error,
        }
      );
    }

    const infohash = parsedTorrent.infoHash;
    if (!infohash) {
      throw new DebridError('Torrent file does not contain an infohash', {
        statusCode: 400,
        statusText: 'Bad Request',
        code: 'BAD_REQUEST',
        headers: {},
        body: null,
      });
    }

    const response = await this.request<VpsDownloadResponse>(
      '/api/v1/torrents',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: torrentUrl, infohash, requestedFileName }),
      }
    );

    const download = this.toDebridDownload(response.download);
    (download as DebridDownload & { existing?: boolean }).existing = response.existing ?? false;
    return download;
  }

  async getMagnet(
    magnetId: string
  ): Promise<DebridDownload> {
    const response = await this.request<{
      download: VpsDownload;
    }>(`/api/v1/magnets/${encodeURIComponent(magnetId)}`);

    return this.toDebridDownload(response.download);
  }

  async removeMagnet(magnetId: string): Promise<void> {
    await this.request(
      `/api/v1/magnets/${encodeURIComponent(magnetId)}`,
      { method: 'DELETE' }
    );
  }

  async generateTorrentLink(
    link: string
  ): Promise<string> {
    const response = await this.request<{ link: string }>(
      `/api/v1/files/${encodeURIComponent(link)}/link`
    );

    return response.link;
  }

  async resolve(
    playbackInfo: PlaybackInfo,
    filename: string,
    cacheAndPlay: boolean,
    _autoRemoveDownloads?: boolean,
    signal?: RequestInit['signal']
  ): Promise<string | undefined> {
    if (playbackInfo.type !== 'torrent') {
      return undefined;
    }

    // Use addTorrent if downloadUrl is available and configured, otherwise use addMagnet
    // Mirrors the logic in StremThruService.resolve
    const useTorrentFile =
      playbackInfo.private !== undefined &&
      playbackInfo.private !== null &&
      playbackInfo.downloadUrl &&
      appConfig.builtins.debrid.useTorrentDownloadUrl;

    let download: DebridDownload;

    if (useTorrentFile && playbackInfo.downloadUrl) {
      download = await this.addTorrent(playbackInfo.downloadUrl, filename);
    } else {
      let magnet = `magnet:?xt=urn:btih:${playbackInfo.hash}`;

      if (playbackInfo.filename) {
        magnet += `&dn=${encodeURIComponent(playbackInfo.filename)}`;
      }

      for (const source of playbackInfo.sources) {
        magnet += `&tr=${encodeURIComponent(source)}`;
      }

      download = await this.addMagnet(magnet, filename);
    }

    // If the download already existed (deduplicated by infohash), don't set up failover cleanup
    // The existing download is managed by the VPS backend's 7-day retention policy
    const existing = (download as DebridDownload & { existing?: boolean }).existing ?? false;
    if (!existing) {
      // Set up failover cleanup: if this resolve attempt loses the parallel race,
      // remove the download we just created. Skip for private torrents (seeding obligations)
      // and library entries (serviceItemId).
      if (!playbackInfo.serviceItemId && !playbackInfo.private) {
        removeDownloadOnAbort(
          signal ?? undefined,
          { id: String(download.id) },
          (id) => this.removeMagnet(id),
          (m) => console.warn(`[VPS] ${m}`)
        );
      }
    }

    if (download.status !== 'downloaded') {
      if (!cacheAndPlay) {
        return undefined;
      }

      const deadline = Date.now() + this.maxWaitTime;

      while (Date.now() < deadline) {
        if (signal?.aborted) {
          throw new DebridError('VPS resolve aborted', {
            statusCode: 499,
            statusText: 'Client Closed Request',
            code: 'UNKNOWN',
            headers: {},
            body: null,
          });
        }

        await sleep(this.pollingInterval);

        let currentDownload: DebridDownload;
        try {
          currentDownload = await this.getMagnet(String(download.id));
        } catch (error) {
          // Download might have been deleted (failover cleanup or manual removal)
          // Treat as timeout to allow failover to try other sources
          if (error instanceof DebridError && error.statusCode === 404) {
            throw new DebridError('VPS download not found (may have been cleaned up)', {
              statusCode: 408,
              statusText: 'Request Timeout',
              code: 'TIMEOUT',
              headers: {},
              body: null,
            });
          }
          throw error;
        }

        if (currentDownload.status === 'downloaded') {
          download = currentDownload;
          break;
        }

        if (currentDownload.status === 'failed' || currentDownload.status === 'invalid') {
          throw new DebridError(
            `VPS download ${currentDownload.status}`,
            {
              statusCode: 502,
              statusText: 'VPS Download Failed',
              code: 'DOWNLOAD_FAILED',
              headers: {},
              body: currentDownload,
            }
          );
        }

        download = currentDownload;
      }

      if (download.status !== 'downloaded') {
        throw new DebridError(
          'Timed out waiting for VPS download',
          {
            statusCode: 408,
            statusText: 'Request Timeout',
            code: 'TIMEOUT',
            headers: {},
            body: download,
          }
        );
      }
    }

    const filesResponse = await this.request<VpsFilesResponse>(
      `/api/v1/magnets/${encodeURIComponent(String(download.id))}/files`,
      undefined,
      signal
    );

    if (filesResponse.files.length === 0) {
      throw new DebridError('VPS download has no files', {
        statusCode: 400,
        statusText: 'No Matching File',
        code: 'NO_MATCHING_FILE',
        headers: {},
        body: filesResponse,
      });
    }

    // `index` identifies the source stream in AIOStreams; it is not the
    // selected file index. Only use the explicit fileIndex for VPS files.
    const requestedIndex = playbackInfo.fileIndex;
    const selected =
      requestedIndex !== undefined
        ? filesResponse.files[requestedIndex]
        : filesResponse.files.find((file) =>
            file.name === filename || file.name.endsWith(filename)
          ) ??
          filesResponse.files.find((file) => file.selected) ??
          filesResponse.files[0];

    if (!selected) {
      throw new DebridError('Unable to select VPS file', {
        statusCode: 400,
        statusText: 'No Matching File',
        code: 'NO_MATCHING_FILE',
        headers: {},
        body: filesResponse,
      });
    }

    return this.generateTorrentLink(selected.id);
  }
}
