import { MiniNativeOutputStringPort } from './mini_native_output_string_port.js';
import { printNativeString } from './print_native_string.js';
// this (errors.js) depends on UString, so vice versa cannot be true
import * as UString from './unicode_string.js';

function printError(out, msg, args) {
    out.consume(msg);
    for (const arg of args) {
        out.consume(' ');
        if (typeof arg === 'string') {
            out.consume(arg);
        } else {
            printNativeString(out, arg, /* printAsExpression */ true, /* quoteDepth */ 0);
        }
    }
}

function makeError(name) {
    /**
     * The "(error msg v ...)" form.
     * Besides Racket values, also allows native strings.
     */
    const e = function (msg, ...args) {
        this.name = name;

        const stringOut = new MiniNativeOutputStringPort();
        printError(stringOut, msg, args);
        this.message = stringOut.getOutputString();

        this.stack = (new Error()).stack;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error()).stack;
        }
    };
    e.prototype = Object.create(Error.prototype);
    e.prototype.constructor = e;

    return (...args) =>
        new (Function.prototype.bind.apply(e, [this].concat(args)))();
}

export const racketCoreError = makeError('RacketCoreError');
export const racketContractError = makeError('RacketContractError');

export function isContractErr(e) {
    return e.name !== undefined && e.name === "RacketContractError";
}
export function isErr(e) {
    return e.name !== undefined && e.name === "RacketCoreError";
}
export function errName(e) { return e.name; }
export function errMsg(e)  { return e.message; }

// this must be here to avoid circular dependency with numbers.js
// copied from internet:
// https://gist.github.com/jlbruno/1535691/db35b4f3af3dcbb42babc01541410f291a8e8fac
function toOrdinal(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

// format exn message to exactly match Racket raise-argument-error
export function makeArgumentError(name, expected, ...rest) {
    const stringOut = new MiniNativeOutputStringPort();
    // "other" args must be converted to string via `print`
    // (not `write` or `display`)
    stringOut.consume(`${name.toString()}: contract violation\n`);
    stringOut.consume('  expected: ');
    stringOut.consume(expected.toString());
    stringOut.consume('\n');
    stringOut.consume('  given: ');
    if (rest.length === 1) {
        printNativeString(stringOut, rest[0], true, 0);
    } else {
        printNativeString(stringOut, rest[rest[0]+1], true, 0);
        if (rest.length > 2) { // only print if there are "other" args
            stringOut.consume('\n');
            stringOut.consume('  argument position: ');
            printNativeString(stringOut, toOrdinal(rest[0]+1), true, 0);
            stringOut.consume('\n');
            stringOut.consume('  other arguments...:');
            for (let i = 1; i < rest.length; i++) {
                if (i === rest[0]+1) { continue; }
                stringOut.consume('\n   ');
                printNativeString(stringOut, rest[i], true, 0);
            }
        }
    }

    return racketContractError(stringOut.getOutputString());
}

// format exn message to exactly match Racket raise-arguments-error
export function makeArgumentsError(name, msg, field, ...rest) {
    const stringOut = new MiniNativeOutputStringPort();
    stringOut.consume(`${name.toString()}: `);
    stringOut.consume(msg);
    stringOut.consume('\n  ');
    stringOut.consume(field);
    stringOut.consume(': ');
    printNativeString(stringOut, rest[0], true, 0);
    for (let i = 1; i < rest.length; i=i+2) {
        stringOut.consume('\n  ');
        stringOut.consume(rest[i]);
        stringOut.consume(': ');
        printNativeString(stringOut, rest[i+1], true, 0);
    }
    return racketContractError(stringOut.getOutputString());
}

// format exn message to exactly match Racket raise-mismatch-error
export function makeMismatchError(name, msg, ...rest) {
    if (rest.length === 0) {
        return racketContractError(name.toString(), msg);
    } else {
        const stringOut = new MiniNativeOutputStringPort();
        stringOut.consume(`${name.toString()}: `);
        stringOut.consume(msg);
        for (let i = 0; i < rest.length; i++) {
            // //string indicates another "msg" format str, see usage above
            // console.log("make-mismatch-err");
            // console.log(rest[i].name);
            if (UString.check(rest[i])) {
            // if (true) {
                stringOut.consume(rest[i]);
            } else {
                printNativeString(stringOut, rest[i], true, 0);
            }
        }
        return racketContractError(stringOut.getOutputString());
    }
}

export function makeOutOfRangeError(name, type, v, len, i) {
    if (i >= len) {
        if (len > 0) {
            return racketContractError(`${name}: index is out of range
  index: ${i}
  valid range: [0, ${len - 1}]
  ${type}: `, v);
        } else {
            return racketContractError(`${name}: index is out of range for empty ${type}
  index: ${i}`);
        }
    }
}
