"use client";

import GitHubComments from "./GitHubComments";

export default function LabComments({ pageId }: { pageId?: string }) {
  return <GitHubComments issueTerm={pageId} />;
}
