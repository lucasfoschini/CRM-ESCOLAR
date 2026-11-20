import { connection } from "next/server";
import { exportGuardians, xlsxResponse } from "@/modules/cadastro/planilhas";

export async function GET() {
  await connection();
  return xlsxResponse(await exportGuardians(), "responsaveis.xlsx");
}
