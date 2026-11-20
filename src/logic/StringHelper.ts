/** Numeric methods copied verbatim from CC helper/StringHelper.ts. */
export class StringHelper {
    static FormatString(str: string, ...replaces: (string | number)[]): string { return this.Format(str, replaces); }
    static Format(str: string, replaces: (string | number)[]): string {
        for (let i = 0; i < replaces.length; i++) {
            str = str.replace(`{${i}}`, `${replaces[i]}`);
        }
        return str;
    }
    static GetLongString(num: number | string, ratio = 100, fixed = 2): string {
        num = +num;
        let n: number = num / ratio;
        if (!Number.isInteger(n)) {
            return n.toFixed(fixed);
        }
        // let str: string = `${n}`;
        // if (~str.indexOf(".") && str.split(".")[1].length > 2) {
        //     return n.toFixed(2);
        // }
        return n.toString();
    }

    static GetLongStringLocale(num: number, ratio = 100, fixed = 2): string {
        const n: number = num / ratio;
        if (!Number.isInteger(n)) {
            return n.toLocaleString('en-US', {
                minimumFractionDigits: fixed,
                maximumFractionDigits: fixed
            });
        }
        return n.toLocaleString('en-US');
    }

    public static GetDecimalN(num: number, n: number = 1) {
        let s = `${num}`;
        let arr = s.split('.');
        if (arr.length == 1 || n < 1) return arr[0]!;
        let a = arr[0]!;
        let b = arr[1]!.substring(0, n);
        return `${+`${a}.${b}`}`;
    }

    /**
     * 核心算法：将任意数字格式化为“最多保留一位小数”的严格去尾文本
     * 示例：2.59 -> "2.5";  2.00 -> "2";  0.55 -> "0.5"
     */
    private static formatToOneDecimalFloor(num: number, fixed: number = 1): string {
        // 核心黑魔法：利用乘以10去尾再除以10，实现严格的“保留一位小数且去尾”
        let floored = Math.floor(num * 10) / 10;
        // 如果去尾后是个整数（比如 2.0），转换为字符串时去掉后面的 .0，直接显示 "2"
        // 如果是小数（比如 2.5），则正常输出 "2.5"
        return floored % 1 === 0 ? floored.toString() : floored.toFixed(fixed);
    }

    /**
     * 核心大数精简算法：纯数字缩写（严格执行一位小数去尾）
     */
    public static GetDecimalNWithKM(num: number): string {
        if (num >= 1000000) {
            let m = num / 1000000;
            return this.formatToOneDecimalFloor(m) + 'M';
        } else if (num >= 1000) {
            let k = num / 1000;
            return this.formatToOneDecimalFloor(k) + 'K';
        }
        // 达不到 K/M 级别的小数，同样用我们自己的去尾算法输出
        return this.GetDecimalNWithoutKM(num);
    }
    public static GetDecimalNWithoutKM(num: number): string {
        return this.formatToOneDecimalFloor(num, 2);
    }
    static GetSignedLongString(num: number): string {
        if (num == 0) {
            return '0';
        }
        if (num > 0) {
            return `+${num / 100}`;
        } else {
            return `${num / 100}`;
        }
    }
    public static LengthNick(nick: string, limit: number = 10) {
        let len = 0;
        let result = nick;
        if (nick?.length) {
            for (let i = 0; i < nick.length; i++) {
                let char_code = nick.charCodeAt(i);
                //半角
                if (char_code >= 0 && char_code <= 0xff) {
                    len++;
                }
                //中文
                if (char_code >= 0x4e00 && char_code <= 0x9fa5) {
                    len += 2;
                }
                //全角
                if (char_code >= 0xff00 && char_code <= 0xffff) {
                    len += 2;
                }
                if (len > limit) {
                    result = nick.substring(0, i) + '...';
                    break;
                }
            }
        }
        return result;
    }
}
