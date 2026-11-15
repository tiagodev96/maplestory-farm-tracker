import { getAuth } from "@/lib/auth";

async function handleAuthRequest(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export { handleAuthRequest as GET, handleAuthRequest as POST };
