import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export async function GET() {
  const { data } = await supabase.from("member_avatars").select("member, url");
  const avatars: Record<string, string> = {};
  for (const row of data ?? []) {
    avatars[row.member] = row.url;
  }
  return NextResponse.json({ avatars });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const member = formData.get("member") as string | null;

    if (!file || !member) {
      return NextResponse.json({ error: "Missing file or member" }, { status: 400 });
    }

    const slug = member.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${slug}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    // Add cache-bust so browsers pick up the new image
    const url = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("member_avatars").upsert({ member, url, updated_at: new Date().toISOString() });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
