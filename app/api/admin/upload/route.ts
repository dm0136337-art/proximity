import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSupabaseClient } from "@/lib/supabase";

const maxFileSize = 5 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": {
    extension: "png",
    signature: (bytes: Uint8Array) =>
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  "image/webp": {
    extension: "webp",
    signature: (bytes: Uint8Array) =>
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
  "image/avif": {
    extension: "avif",
    signature: (bytes: Uint8Array) =>
      String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
      ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12))),
  },
} as const;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxFileSize + 64 * 1024) {
    return NextResponse.json({ error: "The image exceeds the 5 MB limit." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "A valid image upload is required." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A valid image file is required." }, { status: 400 });
  }
  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "The image exceeds the 5 MB limit." }, { status: 413 });
  }

  const imageType = imageTypes[file.type as keyof typeof imageTypes];
  if (!imageType) {
    return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, or AVIF image." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType.signature(bytes)) {
    return NextResponse.json({ error: "The uploaded file does not match its image format." }, { status: 400 });
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for image uploads.");
    return NextResponse.json({ error: "Image uploads are not configured." }, { status: 503 });
  }

  const filePath = `production-graphics/${randomUUID()}.${imageType.extension}`;
  const { data, error } = await client.storage.from("production-assets").upload(filePath, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Could not upload a project image.", { name: error.name });
    return NextResponse.json({ error: "The image could not be uploaded." }, { status: 500 });
  }

  const { data: signedUrl, error: signingError } = await client.storage
    .from("production-assets")
    .createSignedUrl(data.path, 60 * 60);
  if (signingError) {
    console.error("Could not create an image preview URL.", { name: signingError.name });
    const { error: cleanupError } = await client.storage.from("production-assets").remove([data.path]);
    if (cleanupError) {
      console.error("Could not remove an image after preview URL creation failed.", { name: cleanupError.name });
    }
    return NextResponse.json({ error: "The image preview could not be created." }, { status: 500 });
  }

  return NextResponse.json(
    { asset: `storage://production-assets/${data.path}`, previewUrl: signedUrl.signedUrl },
    { status: 201 },
  );
}
