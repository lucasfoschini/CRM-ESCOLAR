import { connection } from "next/server";
import { exportStudents, xlsxResponse } from "@/modules/cadastro/planilhas";

export async function GET() {
  await connection();
  return xlsxResponse(await exportStudents(), "alunos.xlsx");
}
