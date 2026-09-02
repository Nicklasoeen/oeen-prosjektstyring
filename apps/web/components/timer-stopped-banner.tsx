"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TimerStoppedBanner({
  projectName,
  href,
}: {
  projectName: string;
  href: string;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(false);
      router.replace(href, { scroll: false });
    }, 4000);
    return () => {
      window.clearTimeout(id);
    };
  }, [href, router]);

  if (!visible) {
    return null;
  }

  return (
    <p
      role="status"
      className="rounded-xl bg-workspace-wash px-4 py-3 text-sm text-workspace-on-soft"
    >
      Timern på {projectName} ble stoppet.
    </p>
  );
}
