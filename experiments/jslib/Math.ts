declare var math: any;

module TS {
    export class Math {
        public static E = 2.718281828459045;
        public static LN10 = 2.302585092994046;
        public static LN2 = 0.6931471805599453;
        public static LOG2E = 1.4426950408889634;
        public static LOG10E = 0.4342944819032518;
        public static PI = 3.141592653589793;
        public static SQRT1_2 = 0.7071067811865476;
        public static SQRT2 = 1.4142135623730951;

        public static pow(op: number, op2: number): number {
            return op ** op2;
        }

        public static min(op: number, op2: number): number {
            return math.min(op, op2);
        }

        public static max(op: number, op2: number): number {
            return math.max(op, op2);
        }

        public static sin(op: number): number {
            return math.sin(op);
        }

        public static cos(op: number): number {
            return math.cos(op);
        }

        public static asin(op: number): number {
            return math.asin(op);
        }

        public static acos(op: number): number {
            return math.acos(op);
        }

        public static abs(op: number): number {
            return math.abs(op);
        }

        public static floor(op: number): number {
            return math.floor(op);
        }

        public static round(op: number): number {
            return math.round(op);
        }

        public static sqrt(op: number): number {
            return math.sqrt(op);
        }

        public static tan(op: number): number {
            return math.tan(op);
        }

        public static atan(op: number): number {
            return math.atan(op);
        }

        public static atan2(op: number): number {
            return math.atan(op);
        }

        public static log(op: number): number {
            return math.log(op);
        }

        public static exp(op: number): number {
            return math.exp(op);
        }

        public static random(): number {
            return math.random();
        }
    }
}
