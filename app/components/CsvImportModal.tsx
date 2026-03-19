"use client";

import { useEffect, useRef, useState } from "react";
import { detectBankType, BANK_LABELS, type BankType } from "@/lib/parsers";
import { formatCurrency } from "@/lib/utils";

type Account = { id: number; name: string; type: string };
type Step = "select" | "confirm" | "duplicates" | "importing" | "done" | "error";

type DuplicateRow = { date: string; description: string; amount: number; category: string };

type Props = {
  onClose: () => void;
  onImported: () => void;
};

const BANK_ICONS: Record<BankType, string> = {
  "postfinance":    "🟡",
  "postfinance-cc": "💳",
  "handelsbanken":  "🏦",
  "moneydance":     "📊",
  "avanza":         "📈",
  "unknown":        "❓",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function CsvImportModal({ onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep]               = useState<Step>("select");
  const [file, setFile]               = useState<File | null>(null);
  const [bankType, setBankType]       = useState<BankType>("unknown");
  const [accounts, setAccounts]       = useState<Account[]>([]);
  const [accountId, setAccountId]     = useState<number | "">("");
  const [errorMsg, setErrorMsg]       = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [duplicates, setDuplicates]   = useState<DuplicateRow[]>([]);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts).catch(() => {});
  }, []);

  async function handleFile(f: File) {
    const sniff = f.name.endsWith(".csv") ? await f.slice(0, 200).text() : undefined;
    const type = detectBankType(f.name, sniff);
    if (type === "unknown") {
      setErrorMsg(`"${f.name}" is not a recognised export file. Expected a PostFinance, Handelsbanken, Moneydance, or Avanza export.`);
      setStep("error");
      return;
    }
    setFile(f);
    setBankType(type);
    setStep("confirm");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function submitImport(extra: Record<string, string> = {}) {
    if (!file || !accountId) return;
    setStep("importing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", String(accountId));
    for (const [k, v] of Object.entries(extra)) formData.append(k, v);

    try {
      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 409 && data.duplicates) {
        setDuplicates(data.duplicates);
        setStep("duplicates");
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      setImportedCount(data.imported);
      setStep("done");
      onImported();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed.");
      setStep("error");
    }
  }

  function reset() {
    setStep("select");
    setFile(null);
    setBankType("unknown");
    setErrorMsg("");
    setAccountId("");
    setDuplicates([]);
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">Import Transactions</h3>

        <div className="mt-4">
          {/* Step: select file */}
          {(step === "select" || step === "error") && (
            <div className="flex flex-col items-center gap-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-base-300 bg-base-200 px-8 py-12 transition-colors hover:border-primary/30 hover:bg-base-200/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-base-content/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop your bank export here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-base-content/50">
                    PostFinance (.csv) · Handelsbanken (.xlsx) · Moneydance (.csv) · Avanza (.csv)
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              {step === "error" && (
                <p className="text-sm text-error">{errorMsg}</p>
              )}
            </div>
          )}

          {/* Step: confirm */}
          {step === "confirm" && file && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 rounded-lg bg-base-200 px-4 py-3">
                <span className="text-2xl">{BANK_ICONS[bankType]}</span>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-base-content/50">{BANK_LABELS[bankType]}</p>
                </div>
                <button onClick={reset} className="btn btn-ghost btn-xs ml-auto">Change</button>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Import to account</legend>
                {accounts.length === 0 ? (
                  <p className="text-sm text-base-content/50">
                    No accounts found. Add one on the{" "}
                    <a href="/accounts" className="link">Accounts page</a> first.
                  </p>
                ) : (
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(Number(e.target.value))}
                    className="select select-bordered w-full"
                  >
                    <option value="">Select an account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </fieldset>
            </div>
          )}

          {/* Step: duplicates */}
          {step === "duplicates" && (
            <div className="flex flex-col gap-4">
              <div role="alert" className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  <span className="font-semibold">{duplicates.length} transaction{duplicates.length !== 1 ? "s" : ""} already exist</span>
                  {" "}with the same date, description, and amount.
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-base-300">
                <div className="divide-y divide-base-300">
                  {duplicates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{d.description}</p>
                        <p className="text-xs text-base-content/50">{formatDate(d.date)}</p>
                      </div>
                      <span className={`ml-3 shrink-0 text-sm font-medium tabular-nums ${d.amount >= 0 ? "text-success" : ""}`}>
                        {formatCurrency(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="text-sm text-base-content/60">Importing transactions…</p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium">
                {importedCount} transactions imported successfully.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-action">
          {step === "done" ? (
            <button onClick={onClose} className="btn btn-primary">Close</button>
          ) : step === "duplicates" ? (
            <>
              <button onClick={() => submitImport({ skipDuplicates: "true" })} className="btn btn-ghost">
                Skip {duplicates.length} duplicate{duplicates.length !== 1 ? "s" : ""}
              </button>
              <button onClick={() => submitImport({ importAll: "true" })} className="btn btn-primary">
                Import all
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} disabled={step === "importing"} className="btn btn-ghost">Cancel</button>
              {step === "confirm" && (
                <button onClick={() => submitImport()} disabled={!accountId} className="btn btn-primary">
                  Import
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
