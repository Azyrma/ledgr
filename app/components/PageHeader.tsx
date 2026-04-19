import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: string;
  titleExtra?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({ title, subtitle, titleExtra, actions }: Props) {
  return (
    <header className="v2-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="page-sub">{subtitle}</div>}
        </div>
        {titleExtra}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}

export function SplitTitle({ left, right }: { left: string; right: string }) {
  return (
    <>
      {left}
      <em>{right}</em>
    </>
  );
}
