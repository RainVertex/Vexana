import { useEffect, useState } from "react";
import { useChatApi } from "./client";

// Composer-side vision flag, the full ready/reason gate stays in the shell's ChatRoute.
export function useChatConfig(): { visionReady: boolean } {
  const api = useChatApi();
  const [visionReady, setVisionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getConfig()
      .then((c) => {
        if (!cancelled) setVisionReady(c.visionReady);
      })
      .catch(() => {
        if (!cancelled) setVisionReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return { visionReady };
}
