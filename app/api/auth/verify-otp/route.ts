import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const MEMBER_PHONES: Record<string, string> = {
  "Alex":    "+15550001001",
  "Morgan":  "+15550001002",
  "Jordan":  "+15550001003",
  "Casey":   "+15550001004",
  "Riley":   "+15550001005",
  "Taylor":  "+15550001006",
  "Jamie":   "+15550001007",
  "Drew":    "+15550001008",
  "Avery":   "+15550001009",
  "Quinn":   "+15550001010",
  "Parker":  "+15550001011",
  "Blake":   "+15550001012",
  "Reese":   "+15550001013",
  "Sage":    "+15550001014",
  "River":   "+15550001015",
  "Finley":  "+15550001016",
  "Harper":  "+15550001017",
  "Elliott": "+15550001018",
  "Brooks":  "+15550001019",
  "Lane":    "+15550001020",
  "Piper":   "+15550001021",
  "Dallas":  "+15550001022",
  "Hayden":  "+15550001023",
};

export async function POST(req: NextRequest) {
  try {
    const { member, code } = await req.json();
    if (!member || !code) {
      return NextResponse.json({ error: "Missing member or code" }, { status: 400 });
    }

    const phone = MEMBER_PHONES[member];
    if (!phone) {
      return NextResponse.json({ error: "Member not found" }, { status: 400 });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, member });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("verify-otp error", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
