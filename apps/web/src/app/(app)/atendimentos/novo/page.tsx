import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { NewApplicationForm } from "@/components/captacao/new-application-form";
import { getCaptacaoOptions } from "@/modules/captacao/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Novo atendimento" };

async function Form() {
  const [{ attendants, stages }, user] = await Promise.all([getCaptacaoOptions(), getCurrentUser()]);
  const first = stages.find((s) => s.kind === "OPEN");
  return <NewApplicationForm attendants={attendants} currentUserId={user.id} firstStage={{ name: first?.name ?? "", requiredFields: first?.requiredFields ?? [] }} />;
}

export default function NovoAtendimentoPage() {
  return (
    <>
      <PageHeader title="Novo atendimento" description="Cadastre o interessado e o responsável. Se o telefone já existir, o responsável é reaproveitado (sem duplicar)." />
      <Suspense fallback={<Loading />}>
        <Form />
      </Suspense>
    </>
  );
}
