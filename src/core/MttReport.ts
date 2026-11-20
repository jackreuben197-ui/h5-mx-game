export type MttReportSection = 'detail' | 'ranks' | 'hranks' | 'real_prize' | 'rooms';
export interface MttReportResult {
    mtt?: { name?:string; blindtable_type?:number; hunter_on?:number; gold_type?:number; total_buy_times?:number; upblind_interval?:number; start_time?:number; status?:number; addon_begin_bl?:number; addon_end_bl?:number; max_rebuy_bl?:number };
    more?: { sb?:number; nsb?:number; bl?:number; nu?:number; prize_pool?:number; max_chip?:number; avg_chip?:number; min_chip?:number };
    alive?:number;
    sb?:number;
    award?:number;
    award_num?:number;
    prizes?: {min:number;max:number;award?:number;goods?:{na:string;n:number}[]}[];
    real_prize?: Pick<MttReportResult,'award'|'award_num'|'prizes'>;
    records?: {rank?:number;name?:string;rid?:number;urid?:number;chip?:number;award?:number;roomers?:{chip:number}[]}[];
}
