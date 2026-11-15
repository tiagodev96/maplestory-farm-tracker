import type { Metadata } from "next";
import { ImportBackupForm } from "@/features/grind/components/import-backup-form";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="card space-y-3">
        <h1 className="section-title">Exportar</h1>
        <p className="text-sm text-muted">
          Baixa todas as suas sessões em CSV, no formato que o Excel em português abre direto.
        </p>
        {/* Plain anchor: this is a file download from a route handler, not a page navigation. */}
        <a href="/api/export/csv" className="btn" download>
          Exportar CSV
        </a>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Importar do tracker antigo</h2>
        <p className="text-sm text-muted">
          Use o arquivo gerado por &quot;Exportar backup&quot; na versão antiga (a página HTML única).
          Personagens que faltarem são criados, e sessões que já existem aqui são ignoradas, então
          importar o mesmo arquivo duas vezes não duplica nada.
        </p>
        <ImportBackupForm />
      </section>
    </div>
  );
}
