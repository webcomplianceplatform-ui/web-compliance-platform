import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const DEFAULT_EVIDENCE_BUCKET = process.env.EVIDENCE_BUCKET || "evidence-packs";

export function sha256Hex(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export async function uploadEvidencePdf(opts: {
  bucket?: string;
  path: string;
  bytes: Uint8Array;
}) {
  const bucket = opts.bucket || DEFAULT_EVIDENCE_BUCKET;
  const sha256 = sha256Hex(opts.bytes);
  const client = supabaseAdmin();

  const { error } = await client.storage.from(bucket).upload(opts.path, opts.bytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(`storage_upload_failed: ${error.message}`);
  }

  return {
    bucket,
    storagePath: opts.path,
    sha256,
    sizeBytes: opts.bytes.byteLength,
  };
}

export async function createSignedDownloadUrl(opts: {
  bucket?: string;
  path: string;
  expiresInSec?: number;
  downloadFilename?: string;
}) {
  const bucket = opts.bucket || DEFAULT_EVIDENCE_BUCKET;
  const client = supabaseAdmin();
  const expiresIn = Math.min(Math.max(opts.expiresInSec ?? 300, 60), 3600);

  const { data, error } = await client.storage.from(bucket).createSignedUrl(opts.path, expiresIn, {
    download: opts.downloadFilename || true,
  });

  if (error || !data?.signedUrl) {
    throw new Error(`signed_url_failed: ${error?.message || "unknown"}`);
  }
  return data.signedUrl;
}
