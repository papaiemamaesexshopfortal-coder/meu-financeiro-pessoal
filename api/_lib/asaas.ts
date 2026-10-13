type Options = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown };
export async function asaasRequest<T>(path: string, options: Options = {}): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY missing");
  if (process.env.ASAAS_ENVIRONMENT !== "sandbox") throw new Error("Real billing is disabled pending validation");
  const base = "https://api-sandbox.asaas.com/v3";
  const response = await fetch(base + path, {
    method: options.method || "GET",
    headers: { access_token: key, "Content-Type": "application/json", Accept: "application/json", "User-Agent": "MeuFinanceiroPessoal/1.0" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    console.error("asaas_api_failure", response.status);
    throw new Error("Asaas request failed: " + response.status);
  }
  return response.json() as Promise<T>;
}
