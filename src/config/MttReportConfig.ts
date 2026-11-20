/** Shared report request and refresh policy; independent of the selected UI style. */
export class MttReportConfig {
    static readonly pageSize = 50;
    static readonly tickMs = 1000;
    static readonly refreshMs = 5000;
    static readonly maxTimerSeconds = 99 * 60 + 59;
}
