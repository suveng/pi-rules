import { createHash } from "node:crypto";
import type { MatchReason, RuleFrontmatter } from "./types.js";

export interface MatcherInput {
	frontmatter: RuleFrontmatter;
	isSingleFile: boolean;
	/** Path bases to try matching against (POSIX-normalized). */
	pathBases: { projectRelative: string; scopeRelative?: string; basename: string };
}

export interface MatchResult {
	matched: boolean;
	reason: MatchReason;
}

interface CompiledPatternSet {
	positiveMatchers: ReadonlyArray<{ pattern: string; isMatch: PathMatcher }>;
	negativeMatchers: ReadonlyArray<PathMatcher>;
}

export interface MatcherCacheStats {
	entries: number;
	compiledPatterns: number;
}

type PathMatcher = (path: string) => boolean;

const MAX_COMPILED_PATTERN_SET_CACHE_ENTRIES = 256;
const compiledPatternSets = new Map<string, CompiledPatternSet>();

export function matchRule(input: MatcherInput): MatchResult {
	if (input.isSingleFile) {
		return { matched: true, reason: "single-file" };
	}

	if (input.frontmatter.alwaysApply === true) {
		return { matched: true, reason: "alwaysApply" };
	}

	const patterns = normalizeGlobs(input.frontmatter);
	if (patterns.length === 0) {
		return noMatch();
	}

	const pathBases = [
		normalizePath(input.pathBases.projectRelative),
		input.pathBases.scopeRelative ? normalizePath(input.pathBases.scopeRelative) : undefined,
		normalizePath(input.pathBases.basename),
	].filter((pathBase): pathBase is string => pathBase !== undefined);

	const { positiveMatchers, negativeMatchers } = compiledPatternSetFor(patterns);

	for (const { pattern, isMatch } of positiveMatchers) {
		for (const pathBase of pathBases) {
			if (!isMatch(pathBase)) {
				continue;
			}

			if (isExcluded(pathBase, negativeMatchers)) {
				return noMatch();
			}

			return { matched: true, reason: { kind: "glob", pattern } };
		}
	}

	return noMatch();
}

export function normalizeGlobs(frontmatter: RuleFrontmatter): string[] {
	const patterns = [
		...normalizePatternList(frontmatter.globs),
		...normalizePatternList(frontmatter.paths),
		...normalizePatternList(frontmatter.applyTo),
	];

	return [...new Set(patterns.map(normalizePath))];
}

export function hashContent(body: string): string {
	return createHash("sha256").update(body).digest("hex");
}

export function resetMatcherCache(): void {
	compiledPatternSets.clear();
}

export function getMatcherCacheStats(): MatcherCacheStats {
	let compiledPatterns = 0;
	for (const patternSet of compiledPatternSets.values()) {
		compiledPatterns += patternSet.positiveMatchers.length + patternSet.negativeMatchers.length;
	}

	return { entries: compiledPatternSets.size, compiledPatterns };
}

// 【本地改动】裁剪版不再加载任何「目录规则」：PROJECT_RULE_SUBDIRS 与 USER_HOME_* 均为空，
// 候选只可能是 AGENTS.md 这类单文件规则，而 matchRule 在 isSingleFile 分支直接返回，
// 因此 glob 匹配路径永不可达，picomatch 依赖被移除（零依赖：克隆后无需 npm install 即可运行）。
// 若日后恢复目录规则来源，需还原上游实现并重新引入 picomatch。
function compiledPatternSetFor(_patterns: ReadonlyArray<string>): CompiledPatternSet {
	return { positiveMatchers: [], negativeMatchers: [] };
}

function setCompiledPatternSet(cacheKey: string, compiledPatternSet: CompiledPatternSet): void {
	if (compiledPatternSets.size >= MAX_COMPILED_PATTERN_SET_CACHE_ENTRIES) {
		const oldestCacheKey = compiledPatternSets.keys().next().value;
		if (oldestCacheKey !== undefined) {
			compiledPatternSets.delete(oldestCacheKey);
		}
	}
	compiledPatternSets.set(cacheKey, compiledPatternSet);
}

function normalizePatternList(patterns: string | string[] | undefined): string[] {
	if (patterns === undefined) {
		return [];
	}

	return Array.isArray(patterns) ? patterns : [patterns];
}

function normalizePath(path: string): string {
	return path.replaceAll("\\", "/");
}

function isExcluded(pathBase: string, negativeMatchers: ReadonlyArray<(path: string) => boolean>): boolean {
	for (const isMatch of negativeMatchers) {
		if (isMatch(pathBase)) {
			return true;
		}
	}

	return false;
}

function noMatch(): MatchResult {
	return { matched: false, reason: { kind: "no-match" } };
}
