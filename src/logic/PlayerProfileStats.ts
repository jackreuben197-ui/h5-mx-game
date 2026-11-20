import type { PlayerProfile } from '../core/PlayerProfile.js';

type Stats = NonNullable<PlayerProfile['stats']>;
export type PlayerProfileStatsResponse = Omit<Stats, 'room_data' | 'mtt_room_data'> & {
    room_data?: Stats['room_data'] | NonNullable<Stats['room_data']>[];
    mtt_room_data?: Stats['mtt_room_data'] | NonNullable<Stats['mtt_room_data']>[];
};

/** combine/25 returns arrays on H5; older clients also receive single objects. */
export function playerProfileStats(value?: PlayerProfileStatsResponse): PlayerProfile['stats'] {
    if (!value) return undefined;
    const first = <T>(row: T | T[] | undefined): T | undefined => Array.isArray(row) ? row[0] : row;
    return {...value, room_data: first(value.room_data), mtt_room_data: first(value.mtt_room_data)};
}
