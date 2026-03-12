"use client";

import { useEffect, useRef, useState } from "react";
import { detectBankType, BANK_LABELS, type BankType } from "@/lib/parsers";

type Account = { id: number; name: string; type: string };
type Step = "select" | "confirm" | "importing" | "done" | "error";

type Props = {
  onClose: () => void;
  onImported: () => void;
};

const BANK_ICONS: Record<BankType, string> = {
  "postfinance":    "🟡",
  "postfinance-cc": "💳",
  "handelsbanken":  "🏦",
  "unknown":        "❓",
};

export default function CsvImportModal({ onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [bankType, setBankType] = useState<BankType>("unknown");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | "">("");
  const [errorMsg, setErrorMsg] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, []);

  function handleFile(f: File) {
    const type = detectBankType(f.name);
    if (type === "unknown") {
      setErrorMsg(`"${f.name}" is not a recognised export file. Expected a PostFinance or Handelsbanken export.`);
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

  async function handleImport() {
    if (!file || !accountId) return;
    setStep("importing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", String(accountId));

    try {
      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      const data = await res.json();
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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Import Transactions
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Step: select file */}
          {(step === "select" || step === "error") && (
            <div className="flex flex-col items-center gap-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 px-8 py-12 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Drop your bank export here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    PostFinance (.csv) · Handelsbanken (.xlsx)
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
                <p className="text-sm text-red-500">{errorMsg}</p>
              )}
            </div>
          )}

          {/* Step: confirm */}
          {step === "confirm" && file && (
            <div className="flex flex-col gap-5">
              {/* File info */}
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="text-2xl">{BANK_ICONS[bankType]}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{file.name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{BANK_LABELS[bankType]}</p>
                </div>
                <button
                  onClick={reset}
                  className="ml-auto text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  Change
                </button>
              </div>

              {/* Account selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Import to account
                </label>
                {accounts.length === 0 ? (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    No accounts found. Add one on the{" "}
                    <a href="/accounts" className="underline hover:text-zinc-700 dark:hover:text-zinc-200">
                      Accounts page
                    </a>{" "}
                    first.
                  </p>
                ) : (
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(Number(e.target.value))}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">Select an account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Step: importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <svg className="h-8 w-8 animate-spin text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Importing transactions…</p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {importedCount} transactions imported successfully.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          {step === "done" ? (
            <button onClick={onClose} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={step === "importing"}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              {step === "confirm" && (
                <button
                  onClick={handleImport}
                  disabled={!accountId}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Import
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
