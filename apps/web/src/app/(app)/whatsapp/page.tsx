import { Suspense } from "react";
import { MessagesSquare } from "lucide-react";
import { Loading, PendingNote } from "@/components/ui";
import { InboxList, InboxShell, parseInboxParams } from "./inbox";

export const metadata = { title: "WhatsApp" };

async function Inbox({ searchParams }: { searchParams: PageProps<"/whatsapp">["searchParams"] }) {
  const sp = parseInboxParams(await searchParams);
  return (
    <InboxShell list={<InboxList sp={sp} />}>
      <div className="m-auto max-w-sm space-y-3 px-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-ramo-50 text-ramo-700">
          <MessagesSquare aria-hidden className="size-6" />
        </span>
        <p className="font-semibold text-ink">Nenhuma conversa selecionada</p>
        <p className="text-sm text-muted">Escolha uma conversa ao lado ou use + para simular uma mensagem recebida.</p>
        <p className="text-xs text-muted">Versão simulada: nada é enviado nem recebido de verdade (D-027).</p>
        <PendingNote>como a escola divide as conversas, quais status usa e o que é “sem atendente” (roteiro D2, D8).</PendingNote>
      </div>
    </InboxShell>
  );
}

export default function WhatsAppPage({ searchParams }: PageProps<"/whatsapp">) {
  return (
    <Suspense fallback={<Loading />}>
      <Inbox searchParams={searchParams} />
    </Suspense>
  );
}
