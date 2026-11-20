/** Read-only data shown by the CC PlayerInfo dialog. */
export interface PlayerProfile {
  basic?: {
    random_num?: number;
    nick_name?: string;
    avatar?: string;
    sex?: number;
    remark_name?: string;
  };
  stats?: {
    user_random_id?: number;
    room_data?: {
      total_game_cnt?: number;
      vpip?: number;
      prf?: number;
      total_hand?: number;
      wins?: number;
    };
    mtt_room_data?: Partial<Record<'frist_times' | 'second_times' | 'third_times' | 'play_times' | 'win_times', number>>;
    pool_rate?: number;
    allin_data?: {
      active_count?: number;
      active_profit_count?: number;
      passive_count?: number;
      passive_profit_count?: number;
      behind_count?: number;
      behind_profit_count?: number;
      ahead_count?: number;
      ahead_profit_count?: number;
    };
  };
}
