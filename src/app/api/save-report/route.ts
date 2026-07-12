import { handleLeadRegistrationPost } from "@/lib/server/lead-api-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleLeadRegistrationPost(request);
}
