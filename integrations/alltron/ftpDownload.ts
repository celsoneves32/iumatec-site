import fs from "fs";
import path from "path";
import ftp from "basic-ftp";

const LOCAL_DIR = path.join(process.cwd(), "integrations", "alltron", "downloads");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export type DownloadedFiles = {
  localDir: string;
  files: string[];
};

export async function listAlltronRemoteFiles(): Promise<string[]> {
  const client = new ftp.Client(30000);

  try {
    await client.access({
      host: process.env.ALLTRON_HOST!,
      user: process.env.ALLTRON_USER!,
      password: process.env.ALLTRON_PASS!,
      secure: process.env.ALLTRON_SECURE === "true",
    });

    const listing = await client.list();
    return listing.map((f) => f.name);
  } finally {
    client.close();
  }
}

export async function downloadAlltronFiles(
  wantedPatterns: RegExp[] = [
    /artikel.*daten.*\.xml$/i,
    /artikel.*preise.*\.xml$/i,
    /lager.*bestand.*\.xml$/i,
    /artikel.*bilder.*\.(csv|xml)$/i,
  ]
): Promise<DownloadedFiles> {
  ensureDir(LOCAL_DIR);

  const client = new ftp.Client(30000);

  try {
    await client.access({
      host: process.env.ALLTRON_HOST!,
      user: process.env.ALLTRON_USER!,
      password: process.env.ALLTRON_PASS!,
      secure: process.env.ALLTRON_SECURE === "true",
    });

    const listing = await client.list();
    const remoteFiles = listing.map((f) => f.name);

    const matched = remoteFiles.filter((name) =>
      wantedPatterns.some((pattern) => pattern.test(name))
    );

    for (const fileName of matched) {
      const localPath = path.join(LOCAL_DIR, fileName);
      await client.downloadTo(localPath, fileName);
    }

    return {
      localDir: LOCAL_DIR,
      files: matched,
    };
  } finally {
    client.close();
  }
}
