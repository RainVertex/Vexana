import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { useTranslation } from "@internal/i18n";
import type { CurrentUser } from "@internal/shared-types";
import type { DocPageDetail } from "@feature/devdocs-shared";
import { FreshnessBanner } from "./FreshnessBanner";
import { ReportStaleDialog } from "./ReportStaleDialog";
import { CommentsPanel } from "./CommentsPanel";
import { useComments } from "./useDevDocs";
import { useDevdocsApi } from "./client";

export interface DocPageViewProps {
  page: DocPageDetail;
  currentUser: CurrentUser | null;
  onChanged: () => void;
}

export function DocPageView({ page, currentUser, onChanged }: DocPageViewProps) {
  const api = useDevdocsApi();
  const { t } = useTranslation("devdocs");
  const [verifying, setVerifying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const comments = useComments(page.id);

  async function verify() {
    setVerifying(true);
    setActionError(null);
    try {
      await api.verify(page.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("errors.failedVerify"));
    } finally {
      setVerifying(false);
    }
  }

  async function submitStaleReport(reason: string) {
    setSubmittingReport(true);
    setActionError(null);
    try {
      await api.reportStale(page.id, reason || undefined);
      setReportOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("errors.failedReport"));
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <article className="space-y-4">
      <FreshnessBanner
        freshness={page.freshness}
        lastCommitAt={page.lastCommitAt}
        lastCommitBy={page.lastCommitBy}
        verifiedAt={page.verifiedAt}
        verifying={verifying}
        onVerify={verify}
        onReportStale={() => setReportOpen(true)}
      />
      {actionError && (
        <div className="rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {actionError}
        </div>
      )}
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h1 className="text-xl font-semibold text-app-text mb-3">{page.title}</h1>
        <div className="devdocs-markdown text-sm leading-6 text-app-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings, rehypeHighlight]}
          >
            {page.body}
          </ReactMarkdown>
        </div>
      </div>
      <CommentsPanel
        comments={comments.items}
        loading={comments.loading}
        error={comments.error}
        currentUser={currentUser}
        onPost={comments.post}
        onDelete={comments.remove}
      />
      <ReportStaleDialog
        open={reportOpen}
        submitting={submittingReport}
        onSubmit={submitStaleReport}
        onClose={() => setReportOpen(false)}
      />
    </article>
  );
}
