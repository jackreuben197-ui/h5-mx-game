import type { MttReportResult } from '../core/MttReport.js';

/** HTTP uses RFC3339 for start_time and Unix seconds for the last blind increase (nu). */
export function mttTimestampSeconds(value: unknown): number {
    const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    const milliseconds = Number.isFinite(numeric) ? (numeric < 1e12 ? numeric * 1000 : numeric)
        : typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(milliseconds) && milliseconds > 0 ? Math.floor(milliseconds / 1000) : 0;
}

export function mttReportTiming(detail: MttReportResult, now = Math.floor(Date.now() / 1000)) {
    const start = mttTimestampSeconds(detail.mtt?.start_time);
    const preStart = detail.mtt?.status === 0;
    const interval = Math.max(0, Number(detail.mtt?.upblind_interval) || 0);
    const lastBlind = mttTimestampSeconds(detail.more?.nu);
    const deadline = preStart ? start : lastBlind ? lastBlind + interval : 0;
    return {
        preStart, start, deadline,
        elapsed: start ? Math.max(0, now - start) : 0,
        // Wait for authoritative detail at zero; never restart a whole level locally.
        remaining: deadline ? Math.max(0, deadline - now) : preStart ? 0 : interval,
    };
}

export function mttDuration(seconds: number, hours = false): string {
    const total = Math.max(0, Math.floor(seconds));
    const parts = hours ? [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
        : [Math.floor(total / 60), total % 60];
    return parts.map(value => String(value).padStart(2, '0')).join(':');
}
