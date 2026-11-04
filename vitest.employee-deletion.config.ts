// Isolate server-handler unit tests from the TanStack RPC Vite transform.
export default {
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { environment: "node", include: ["src/lib/employee-deletion.test.ts"] },
};