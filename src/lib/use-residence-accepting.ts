"use client";

import { useEffect, useState } from "react";
import {
  COMMUNITY_PROFILE_CHANGED_EVENT,
  isResidenceAcceptingApplications,
} from "@/lib/community-portal";

/** Live read of whether a residence is open for new applications. */
export function useResidenceAcceptingApplications(residenceId?: string | null) {
  const [accepting, setAccepting] = useState(true);

  useEffect(() => {
    if (!residenceId) {
      setAccepting(true);
      return;
    }
    const sync = () => setAccepting(isResidenceAcceptingApplications(residenceId));
    sync();
    window.addEventListener(COMMUNITY_PROFILE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMMUNITY_PROFILE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [residenceId]);

  return accepting;
}
