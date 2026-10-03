/** Pure text transforms behind the Markdown editor's toolbar and key handling: each takes the textarea's value + selection and returns the next one. */
export interface EditState {
    value: string;
    start: number;
    end: number;
}

/** Bold/italic/code/etc.: wraps the selection, or unwraps it if it's already wrapped. */
export function wrap(s: EditState, before: string, after = before, placeholder = 'text'): EditState {
    const { value, start, end } = s;
    if (start >= before.length && value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after) {
        return { value: value.slice(0, start - before.length) + value.slice(start, end) + value.slice(end + after.length), start: start - before.length, end: end - before.length };
    }
    const selected = value.slice(start, end) || placeholder;
    return {
        value: value.slice(0, start) + before + selected + after + value.slice(end),
        start: start + before.length,
        end: start + before.length + selected.length,
    };
}

function lineRange(value: string, start: number, end: number): [number, number] {
    const from = value.lastIndexOf('\n', start - 1) + 1;
    // A selection ending exactly at a line start doesn't include that line.
    const effectiveEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const nl = value.indexOf('\n', effectiveEnd);
    return [from, nl === -1 ? value.length : nl];
}

interface LineOp {
    has: (line: string) => boolean;
    add: (line: string, index: number) => string;
    remove: (line: string) => string;
}

export function toggleLines(s: EditState, op: LineOp): EditState {
    const [from, to] = lineRange(s.value, s.start, s.end);
    const lines = s.value.slice(from, to).split('\n');
    const targets = lines.filter((l) => l.trim());
    const removing = targets.length > 0 && targets.every(op.has);
    let i = 0;
    const next = lines.map((l) => (l.trim() || lines.length === 1 ? (removing ? op.remove(l) : op.add(l, i++)) : l)).join('\n');
    return { value: s.value.slice(0, from) + next + s.value.slice(to), start: from, end: from + next.length };
}

export const quote = (s: EditState) => toggleLines(s, { has: (l) => /^>\s?/.test(l), add: (l) => `> ${l}`, remove: (l) => l.replace(/^>\s?/, '') });
export const bulletList = (s: EditState) => toggleLines(s, { has: (l) => /^- (?!\[[ xX]\])/.test(l), add: (l) => `- ${l}`, remove: (l) => l.replace(/^- /, '') });
export const numberedList = (s: EditState) => toggleLines(s, { has: (l) => /^\d+\.\s/.test(l), add: (l, i) => `${i + 1}. ${l}`, remove: (l) => l.replace(/^\d+\.\s/, '') });
export const taskList = (s: EditState) => toggleLines(s, { has: (l) => /^- \[[ xX]\] /.test(l), add: (l) => `- [ ] ${l}`, remove: (l) => l.replace(/^- \[[ xX]\] /, '') });
export const heading = (s: EditState, level: number) => {
    const prefix = `${'#'.repeat(level)} `;
    return toggleLines(s, {
        has: (l) => l.startsWith(prefix),
        add: (l) => prefix + l.replace(/^#{1,6}\s+/, ''),
        remove: (l) => l.slice(prefix.length),
    });
};

/** Puts a block (code fence, table, rule, callout…) at the cursor on its own paragraph, replacing the selection. `select` marks the part of `text` to leave selected. */
export function insertBlock(s: EditState, text: string, select?: [number, number]): EditState {
    const before = s.value.slice(0, s.start);
    const after = s.value.slice(s.end);
    const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    const base = before.length + lead.length;
    const [a, b] = select ?? [text.length, text.length];
    return { value: before + lead + text + trail + after, start: base + a, end: base + b };
}

export function codeBlock(s: EditState, lang: string): EditState {
    const selected = s.value.slice(s.start, s.end);
    const open = `\`\`\`${lang}\n`;
    return insertBlock(s, `${open}${selected}\n\`\`\``, selected ? [open.length, open.length + selected.length] : [open.length, open.length]);
}

export function callout(s: EditState, type: string): EditState {
    const selected = s.value.slice(s.start, s.end);
    const head = `> [!${type.toUpperCase()}]\n`;
    const body = selected ? selected.split('\n').map((l) => `> ${l}`).join('\n') : '> ';
    return insertBlock(s, head + body, [head.length + body.length, head.length + body.length]);
}

export function link(s: EditState): EditState {
    const selected = s.value.slice(s.start, s.end);
    const label = selected || 'text';
    const text = `[${label}](url)`;
    // With a selection the URL is the thing to type next; without one, the label is.
    const [a, b] = selected ? [label.length + 3, label.length + 6] : [1, 1 + label.length];
    return { value: s.value.slice(0, s.start) + text + s.value.slice(s.end), start: s.start + a, end: s.start + b };
}

export const TABLE_TEMPLATE = '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |';

/** Enter inside a list/quote continues it (incrementing numbers, new unchecked task); Enter on an empty item exits the list. Returns null to let the browser handle Enter normally. */
export function continueList(s: EditState): EditState | null {
    if (s.start !== s.end) return null;
    const { value, start } = s;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nl = value.indexOf('\n', start);
    const lineEnd = nl === -1 ? value.length : nl;
    if (start !== lineEnd) return null;
    const line = value.slice(lineStart, lineEnd);

    const list = line.match(/^(\s*)(?:([-*+])|(\d+)\.)\s+(\[[ xX]\]\s+)?(.*)$/);
    const quoted = !list ? line.match(/^(\s*>\s?)(.*)$/) : null;
    if (!list && !quoted) return null;

    const content = list ? list[5] : quoted![2];
    if (!content.trim()) {
        return { value: value.slice(0, lineStart) + value.slice(lineEnd), start: lineStart, end: lineStart };
    }
    const marker = list
        ? `${list[1]}${list[2] ?? `${Number(list[3]) + 1}.`} ${list[4] ? '[ ] ' : ''}`
        : quoted![1];
    const insertion = `\n${marker}`;
    const pos = start + insertion.length;
    return { value: value.slice(0, start) + insertion + value.slice(start), start: pos, end: pos };
}

const INDENT = '    ';

export function indent(s: EditState, outdent: boolean): EditState | null {
    if (s.start === s.end && !outdent) {
        return { value: s.value.slice(0, s.start) + INDENT + s.value.slice(s.end), start: s.start + INDENT.length, end: s.start + INDENT.length };
    }
    const [from, to] = lineRange(s.value, s.start, s.end);
    const lines = s.value.slice(from, to).split('\n');
    const next = lines.map((l) => (outdent ? l.replace(/^( {1,4}|\t)/, '') : l ? INDENT + l : l)).join('\n');
    if (next === s.value.slice(from, to)) return null;
    return { value: s.value.slice(0, from) + next + s.value.slice(to), start: from, end: from + next.length };
}
