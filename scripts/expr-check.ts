/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the expression evaluator: `npm run check:expr`.
 *
 * The project has no test runner, so this is a plain tsx script — it prints
 * every case that misbehaves and exits non-zero, which is enough to keep the
 * parser honest as the simulator grows on top of it.
 */

import { evaluateExpression, parseExpression, ExprError, describeExprError, formatValue, Env, Value } from '../src/core/expr';

const env: Env = new Map<string, Value>([['a', 7], ['b', 2], ['i', 3], ['ime', 'Dino'], ['ok', true]]);
let pass = 0, fail = 0;

function ok(src: string, expected: Value) {
  try {
    const got = evaluateExpression(src, env);
    if (got === expected) { pass++; }
    else { fail++; console.log(`FAIL  ${src}  => ${formatValue(got as Value)} (expected ${formatValue(expected)})`); }
  } catch (e) {
    fail++; console.log(`THROW ${src}  => ${(e as Error).message}`);
  }
}

function bad(src: string, code: string) {
  try {
    const got = evaluateExpression(src, env);
    fail++; console.log(`NO-ERR ${src} => ${formatValue(got as Value)} (expected ${code})`);
  } catch (e) {
    const err = e as ExprError;
    if (err.code === code) { pass++; }
    else { fail++; console.log(`FAIL  ${src} => ${err.code} (expected ${code})`); }
  }
}

// arithmetic and precedence
ok('1 + 2 * 3', 7);
ok('(1 + 2) * 3', 9);
ok('10 - 3 - 2', 5);
ok('2 ** 3 ** 2', 512);       // right associative
ok('-2 ** 2', -4);            // like Python
ok('2 ** -1', 0.5);
ok('7 / 2', 3.5);
ok('-7 % 3', 2);              // Python sign rule
ok('a * b + 1', 15);
ok('0.5 + .25', 0.75);

// strings
ok('"zbir = " + a', 'zbir = 7');
ok("'a' + \"b\"", 'ab');
ok('ime + "!"', 'Dino!');
ok('len(ime)', 4);

// comparisons; single = is equality
ok('a = 7', true);
ok('a == 7', true);
ok('a <> b', true);
ok('a != b', true);
ok('i <= 10', true);
ok('"abc" < "abd"', true);
ok('a = "7"', false);         // cross-type equality is false, not an error

// bosnian `i` is AND in operator position, a variable in operand position
ok('i < 10 i a > 1', true);
ok('i + 1', 4);
ok('a > 100 ili b = 2', true);
ok('ne (a = 7)', false);
ok('nije ok', false);
ok('a > 1 and b < 5', true);
ok('a > 1 und b < 5', true);
ok('wahr ili falsch', true);
ok('tacno', true);
ok('tačno', true);            // diacritics

// short circuit: right side would divide by zero
ok('b <> 0 i a / b > 1', true);
ok('b = 0 i a / 0 > 1', false);

// builtins
ok('abs(0 - 5)', 5);
ok('sqrt(9)', 3);
ok('round(3.14159, 2)', 3.14);
ok('int("42")', 42);
ok('int(-3.7)', -3);
ok('min(3, 1, 2)', 1);
ok('max(a, b)', 7);
ok('ABS(0 - 2)', 2);          // case-insensitive builtin

// errors
bad('x + 1', 'undefined-var');
bad('1 / 0', 'div-zero');
bad('7 % 0', 'div-zero');
bad('"abc" * 2', 'type-mismatch');
bad('"abc" < 2', 'type-mismatch');
bad('a i b', 'not-boolean');
bad('(1 + 2', 'missing-paren');
bad('1 +', 'unexpected-end');
bad('foo(1)', 'unknown-function');
bad('sqrt(1, 2)', 'bad-arity');
bad('1 @ 2', 'bad-char');
bad('', 'empty');
bad('1 2', 'unexpected-token');
bad('"unterminated', 'unexpected-end');

// formatting
console.log('format:', formatValue(0.1 + 0.2), formatValue(4), formatValue(true), formatValue(1/3));

// localized messages
try { evaluateExpression('zbir + 1', env); } catch (e) {
  const err = e as ExprError;
  console.log('bs:', describeExprError(err, 'bs'));
  console.log('de:', describeExprError(err, 'de'));
  console.log('en:', describeExprError(err, 'en'));
}

// the tree is reusable, so a simulator can parse a loop condition once
const tree = parseExpression('i <= 10');
console.log('reparse-free eval:', formatValue(evaluateExpression('i <= 10', env)), JSON.stringify(tree.kind));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
