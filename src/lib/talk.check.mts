/**
 * Self-check for the Runners' Talk body parser (callouts + checkpoints).
 *
 * Run: node --experimental-strip-types src/lib/talk.check.mts
 */
import assert from 'node:assert';
import { checkpoints, parseBody } from './talk.ts';

const md = [
  'Intro.',
  '## What the timing tells you',
  'Text.',
  ':::check The cadence count',
  'Count steps.',
  '## Not a checkpoint',
  ':::',
  ':::stop Stop if',
  '- swelling',
  ':::',
  '## Treatment',
  'End.',
].join('\n');

const segs = parseBody(md);
assert.deepEqual(segs.map((s) => s.kind), ['md', 'check', 'stop', 'md']);
assert.equal(segs[1].kind === 'check' && segs[1].title, 'The cadence count');
assert.deepEqual(checkpoints(md).map((c) => c.id), ['what-the-timing-tells-you', 'treatment']);
assert.deepEqual(parseBody('Just text.'), [{ kind: 'md', md: 'Just text.' }]);
console.log('talk.check ok');
