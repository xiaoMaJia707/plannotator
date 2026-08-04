import React from "react";
import type { CommitListEntry } from "@plannotator/shared/types";
import { PanelViewToggle, type ReviewPanelView } from "./PanelViewToggle";
import { Avatar } from "./Avatar";
import { OverlayScrollArea } from "@plannotator/ui/components/OverlayScrollArea";
import { formatRelativeTime } from "@plannotator/ui/utils/aiChatFormat";

/**
 * The Commits panel — a pure linear history rail (`git log --first-parent`,
 * newest first) rendered as compact overview cards. It never becomes a file
 * list: clicking a commit opens that commit's own diff (vs its first parent)
 * in the center dock as the all-files view.
 *
 * Two labeled groups replace a bare ref divider: "On this branch" (commits not
 * yet reachable from the base) and "In <base>" (shared history) — the split is
 * the same merge boundary the since-base review compares against.
 */

interface CommitsPanelProps {
	width?: number;
	commits: CommitListEntry[];
	/** Base ref the group boundary represents (e.g. `origin/main`). */
	base: string | null;
	hasMore: boolean;
	isLoading: boolean;
	isLoadingMore: boolean;
	error: string | null;
	/** Full sha of the commit whose diff is on screen, if any. */
	activeCommitSha: string | null;
	onSelectCommit: (sha: string) => void;
	onShowMore: () => void;
	onRetry: () => void;
	/** View switcher, same header slot as the other panels. */
	onSelectPanelView: (view: ReviewPanelView) => void;
	/** Whether the Git status segment is offered (since-base capable repos). */
	showSectionsOption: boolean;
	/** Kick off an AI "what/why/assumptions" explanation of this commit's diff.
	 * When absent the button is hidden (e.g. the plannotator-explain-commit skill
	 * is not curated). The parent owns diff-switch + job-launch sequencing. */
	onExplainCommit?: (sha: string) => void;
	/** SHA currently being explained — used to render an inline spinner state on
	 * that row. Null when no explanation is in flight. */
	explainingCommitSha?: string | null;
}

const CommitRow: React.FC<{
	commit: CommitListEntry;
	isActive: boolean;
	onSelect: () => void;
	onExplain?: () => void;
	isExplaining?: boolean;
}> = ({ commit, isActive, onSelect, onExplain, isExplaining }) => (
	// Row is a div (not button) so the inner Explain control is a real focusable
	// child rather than a nested button (invalid HTML). Selection is triggered
	// by an inner clickable area that covers everything except the Explain
	// control's own hit box.
	<div
		className={`group relative w-full text-left transition-colors ${
			isActive ? "bg-primary/10" : "hover:bg-muted/50"
		}`}
		title={`${commit.sha}\n${commit.author} <${commit.authorEmail}>\n${commit.subject}`}
	>
		<button
			type="button"
			onClick={onSelect}
			className="w-full text-left px-2 py-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
		>
			{/* Subject — always one line, ellipsized. Reserve trailing space for the
          Explain button when applicable so hover-reveal doesn't shove text. */}
			<div className="flex items-center gap-1.5 min-w-0">
				<span className="text-xs truncate flex-1">{commit.subject}</span>
				{commit.isHead && (
					<span className="text-[9px] leading-none px-1 py-0.5 rounded bg-primary/15 text-primary font-medium flex-shrink-0">
						HEAD
					</span>
				)}
				<span className="text-[10px] text-muted-foreground/70 tabular-nums flex-shrink-0">
					{formatRelativeTime(commit.committedAt)}
				</span>
				{onExplain && <span className="w-4 flex-shrink-0" aria-hidden />}
			</div>
			{/* Meta — avatar + author (always shown) + sha. */}
			<div className="mt-0.5 flex items-center gap-1.5 min-w-0">
				<Avatar src={commit.avatarUrl} name={commit.author} size={14} />
				<span className="text-[11px] text-muted-foreground truncate">
					{commit.author}
				</span>
				<span className="flex-1" />
				<span className="font-mono text-[10px] text-muted-foreground/70 flex-shrink-0">
					{commit.shortSha}
				</span>
			</div>
		</button>
		{onExplain && (
			<button
				type="button"
				onClick={(e) => {
					// Stop propagation so the outer selection button doesn't ALSO fire —
					// the parent handler already switches the diff before launching.
					e.stopPropagation();
					if (!isExplaining) onExplain();
				}}
				disabled={isExplaining}
				title={
					isExplaining
						? "Explaining…"
						: "Explain this commit with AI (what / why / assumptions)"
				}
				aria-label={
					isExplaining
						? "Explaining commit with AI"
						: "Explain this commit with AI"
				}
				className={`absolute right-2 top-1.5 h-4 w-4 flex items-center justify-center rounded text-[10px] leading-none transition-opacity ${
					isExplaining
						? "opacity-100 text-primary"
						: "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-primary"
				}`}
			>
				{isExplaining ? (
					<span className="inline-block h-2.5 w-2.5 border border-current border-r-transparent rounded-full animate-spin" />
				) : (
					// Sparkle glyph — small, monochrome, matches surrounding icon set.
					<svg
						viewBox="0 0 24 24"
						width="12"
						height="12"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden
					>
						<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
					</svg>
				)}
			</button>
		)}
	</div>
);

/** The base boundary — commits below are already part of the base. Rendered
 * as a prominent labeled rule so the split reads at a glance. */
const BaseBoundary: React.FC<{ base: string }> = ({ base }) => (
	<div
		className="flex items-center gap-2 px-2 py-2"
		title={`Commits from here down are already part of ${base} — shared history, not branch work.`}
	>
		<span className="h-px flex-1 bg-foreground/30" />
		<span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[160px]">
			In {base}
		</span>
		<span className="h-px flex-1 bg-foreground/30" />
	</div>
);

const GroupHeader: React.FC<{ label: string; title: string }> = ({
	label,
	title,
}) => (
	<div
		className="px-2 pt-1 pb-1 text-[11px] font-medium text-muted-foreground"
		title={title}
	>
		{label}
	</div>
);

export const CommitsPanel: React.FC<CommitsPanelProps> = ({
	width,
	commits,
	base,
	hasMore,
	isLoading,
	isLoadingMore,
	error,
	activeCommitSha,
	onSelectCommit,
	onShowMore,
	onRetry,
	onSelectPanelView,
	showSectionsOption,
	onExplainCommit,
	explainingCommitSha,
}) => {
	// isPastBase is a suffix of the linear walk (reachability from the base is
	// monotone along first parents), so one boundary is exhaustive.
	const boundaryIndex = commits.findIndex((c) => c.isPastBase);
	const showGroups = boundaryIndex !== -1 && !!base;

	return (
		<aside
			className="border-r border-border/50 bg-card/30 flex flex-col flex-shrink-0 overflow-hidden"
			style={{ width: width ?? 256 }}
		>
			{/* Header — same slot/layout as the other panel views. */}
			<div
				className="px-3 flex items-center border-b border-border/50 flex-shrink-0"
				style={{ height: "var(--panel-header-h)" }}
			>
				<div className="w-full flex items-center justify-between gap-2">
					<PanelViewToggle
						view="commits"
						onSelect={onSelectPanelView}
						showSections={showSectionsOption}
						showCommits
					/>
					<span className="text-xs text-muted-foreground tabular-nums">
						{commits.length}
					</span>
				</div>
			</div>

			<OverlayScrollArea className="flex-1 min-h-0">
				<div className="py-1">
					{error && commits.length === 0 ? (
						// Full-panel error only when there's nothing to show — an error
						// with a populated list renders inline below it instead, so a
						// failed page/refresh never wipes the rail the user is reading.
						<div className="px-2 py-4 text-center space-y-2">
							<div className="text-xs text-destructive break-words">
								{error}
							</div>
							<button
								onClick={onRetry}
								className="text-[11px] text-primary/80 underline underline-offset-2 decoration-primary/40 hover:text-primary transition-colors"
							>
								Retry
							</button>
						</div>
					) : isLoading && commits.length === 0 ? (
						<div className="py-6 text-center text-xs text-muted-foreground/50">
							Loading commits…
						</div>
					) : commits.length === 0 ? (
						<div className="py-6 text-center text-xs text-muted-foreground/50">
							No commits
						</div>
					) : (
						<>
							{commits.map((commit, index) => (
								<React.Fragment key={commit.sha}>
									{showGroups && index === 0 && boundaryIndex > 0 && (
										<GroupHeader
											label="On this branch"
											title={`Commits that exist only on this branch — not yet part of ${base}.`}
										/>
									)}
									{showGroups && index === boundaryIndex && (
										<BaseBoundary base={base!} />
									)}
									<CommitRow
										commit={commit}
										isActive={commit.sha === activeCommitSha}
										onSelect={() => onSelectCommit(commit.sha)}
										onExplain={
											onExplainCommit
												? () => onExplainCommit(commit.sha)
												: undefined
										}
										isExplaining={explainingCommitSha === commit.sha}
									/>
								</React.Fragment>
							))}
							{hasMore && (
								<button
									onClick={onShowMore}
									disabled={isLoadingMore}
									className="w-full text-left px-2 py-1 text-[11px] text-primary/80 underline underline-offset-2 decoration-primary/40 hover:text-primary hover:decoration-primary transition-colors disabled:opacity-50"
								>
									{isLoadingMore ? "Loading…" : "Show more"}
								</button>
							)}
							{error && (
								<div className="px-2 py-1.5 flex items-center gap-2 text-[11px] text-destructive">
									<span className="truncate flex-1" title={error}>
										{error}
									</span>
									<button
										onClick={onRetry}
										className="flex-shrink-0 text-primary/80 underline underline-offset-2 decoration-primary/40 hover:text-primary transition-colors"
									>
										Retry
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</OverlayScrollArea>
		</aside>
	);
};
