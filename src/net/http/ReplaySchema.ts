// Type declarations copied from CC WebRoomCenterHistoryReplay.
export declare class WebRoomCenterHistoryReplay {
    static API: string;
    public static WatchedUserHand: {
        user_rid: number; //玩家随机ID
        data: string; //手牌数据
    };
    public static Data: {
        d: number[]; //自己手牌
        s: typeof WebRoomCenterHistoryReplay.S;
        u: number; //自己用户随机ID
        be_watched_user_hands?: (typeof WebRoomCenterHistoryReplay.WatchedUserHand)[]; //偷偷看手牌数据
    };
    //字段声明
    // static RequestParams: {
    // } = null;
    // static ResponseData: {
    //     org_id: number, // 公会ID
    //     gold: number, // 公会金豆数
    //     gold_lock: number, // 公会被锁定的金豆数
    //     forbidden: boolean, // 是否冻结 true已冻结，false未冻结
    //     club_name: string,   //公会名字
    // } = null;
    // public sealed class ResponseData : WebResponseDataBase
    // {
    //     public Data data { get; set; }
    // }
    public static S: {
        result: (typeof WebRoomCenterHistoryReplay.Result)[];
        etime: number; //结束时间戳
        straddle: boolean; //是否开启straddle
        stime: number; //开始时间戳
        hand: number; //手数
        table: typeof WebRoomCenterHistoryReplay.Table; //参与牌局的所有人信息
        name: string; //房间名字
        rid: number; //房间id
        mid: number; //比赛id
        unique: string; //唯一id
        procedure: typeof WebRoomCenterHistoryReplay.Procedure;
    };
    public static Result: {
        sn: number; //座位号
        win: number; //赢的筹码
        ins: number; //保险
        fee: number; //服务费
        active: boolean; //是否存活
        maxcard_idx: number[]; //最大牌型数组下标
        card_type: number; //最大牌型
        card: number[]; //玩家手牌
        maxcard_idx2: number[]; //第二套牌，最大牌型数组下标
        card_type2: number; //最大牌型
        sp_detail: (typeof WebRoomCenterHistoryReplay.SpDetail)[]; //第二套牌赢牌详情
    };
    public static SpDetail: {
        win: number; //赢得筹码
        is_winner: boolean; //是否赢牌
    };
    public static Table: {
        ante: number; //前注
        pl: (typeof WebRoomCenterHistoryReplay.Pl)[];
        sb: typeof WebRoomCenterHistoryReplay.SbAndBb; //小盲注
        bb: typeof WebRoomCenterHistoryReplay.SbAndBb; //大盲注
        straddle: boolean; //强制盲注
        btn: number; //庄位
        seatcount: number; //最大座位号
    };
    public static Procedure: {
        ante: typeof WebRoomCenterHistoryReplay.Ante;
        preflop: typeof WebRoomCenterHistoryReplay.Preflop;
        flop: typeof WebRoomCenterHistoryReplay.Flop;
        turn: typeof WebRoomCenterHistoryReplay.Turn;
        river: typeof WebRoomCenterHistoryReplay.Tiver;
    };
    public static Ante: {
        pl: (typeof WebRoomCenterHistoryReplay.ProcedurePl)[];
    };
    public static Pl: {
        sn: number; //座位号
        c: number; //初始筹码
        avatar: string; //头像
        name: string; //名字
        uid: number; //随机id
    };
    public static SbAndBb: {
        sn: number; //座位号
        bet: number; //下注筹码
    };
    public static Preflop: {
        pl: (typeof WebRoomCenterHistoryReplay.ProcedurePl)[];
    };
    public static Flop: {
        pl: (typeof WebRoomCenterHistoryReplay.ProcedurePl)[];
        card: number[]; //公共牌
        showcard: boolean; //是否show牌
    };
    public static Turn: {
        pl: (typeof WebRoomCenterHistoryReplay.ProcedurePl)[];
        card: number[]; //公共牌
        showcard: boolean; //是否show牌
    };
    public static Tiver: {
        pl: (typeof WebRoomCenterHistoryReplay.ProcedurePl)[];
        card: number[]; //公共牌
        showcard: boolean; //是否show牌
        scard: number[]; //第二套公共牌
    };
    public static ProcedurePl: {
        c: number; //剩余筹码
        pot_out: number; //池
        sn: number; //座位号
        act: string; //动作
        act_amt: number; //该动作筹码
        ins: number; //保险
    };
}

