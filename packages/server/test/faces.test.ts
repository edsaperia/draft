/**
 * Faces, server-side (review #1, finding 19): the page's reserved-glyph
 * scan and one-face-one-member rule were client-side only, so a member
 * could claim ✏️ or another member's face through the API. The server now
 * carries the same lists — asserted equal to the page's here, so neither
 * drifts — and refuses in the page's own words.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FACE_EMOJI, SURFACE_EMOJI, emojiFaceOf } from '../src/faces.js';
import { faceTakenBy, runCommand, validPicture } from '../src/commands.js';
import { ConstitutionSession } from '../../constitution/src/index.js';

const SETUP_JS = join(import.meta.dirname, '..', '..', '..', 'design', 'setup.js');

describe('the lists are the page\'s', () => {
  it('FACE_EMOJI and SURFACE_EMOJI equal design/setup.js byte for byte', () => {
    const page = readFileSync(SETUP_JS, 'utf8');
    const faces = page.match(/const FACE_EMOJI = (\[[\s\S]*?\]);/);
    const surf = page.match(/const SURFACE_EMOJI = \(([\s\S]*?)\)\.split\(' '\);/);
    expect(faces).toBeTruthy();
    expect(surf).toBeTruthy();
    expect(FACE_EMOJI).toEqual(eval(faces![1]!) as string[]);
    expect(SURFACE_EMOJI).toEqual((eval(surf![1]!) as string).split(' '));
  });
});

describe('what a face may be', () => {
  it('one pictographic grapheme, never the furniture, tones stripped before the test', () => {
    expect(emojiFaceOf('🦊')).toBe('🦊');
    expect(emojiFaceOf('👩🏽')).toBe('👩🏽');
    expect(emojiFaceOf('✏️')).toBe('reserved');
    expect(emojiFaceOf('✋🏽')).toBe('reserved');
    expect(emojiFaceOf('🦊🦊')).toBeNull();
    expect(emojiFaceOf('A')).toBeNull();
    expect(emojiFaceOf('')).toBeNull();
    expect(validPicture('e🦊')).toBe('e🦊');
    expect(() => validPicture('e✏️')).toThrow('furniture');
    expect(() => validPicture('e🦊🦊')).toThrow('one emoji');
    expect(() => validPicture('eA')).toThrow('one emoji');
  });

  // Q734, 2026-08-23: the grounds and the drawn marks left the picker, and
  // are refused rather than merely un-offered — nothing historical needs
  // tolerating (Ed: alpha, no real documents), and a shape the surface
  // cannot make is one nothing should accept.
  it('a picture is an emoji or an uploaded image, and nothing else', () => {
    expect(() => validPicture('c3')).toThrow('unrecognised picture format');
    expect(() => validPicture('m0')).toThrow('unrecognised picture format');
    expect(validPicture('udata:image/jpeg;base64,AAAA')).toBe('udata:image/jpeg;base64,AAAA');
    expect(() => validPicture('udata:image/svg+xml;base64,AAAA')).toThrow('unrecognised');
    // the cap is what the page now encodes, not what a raw camera file was
    expect(() => validPicture('udata:image/jpeg;base64,' + 'A'.repeat(40_001)))
      .toThrow('too long');
  });

  it('a taken face is refused in the page\'s words; your own and a differently toned one are not', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.setIdentity(2, bo, { name: 'Bo', picture: 'e🦊' });
    expect(faceTakenBy(s, 'e🦊', 'ada')).toBe('Bo');
    expect(faceTakenBy(s, 'e🦊', bo)).toBeNull();
    expect(faceTakenBy(s, 'e🦊🏽', 'ada')).toBeNull();
    expect(faceTakenBy(s, 'c1', 'ada')).toBeNull();
    const ada = { memberId: 'ada', isFounder: true, applicantId: null };
    expect(() => runCommand(s, ada, 3, 'set-identity', { picture: 'e🦊' }))
      .toThrow('Taken — Bo got there first.');
    runCommand(s, ada, 3, 'set-identity', { picture: 'e🦊🏽' });
    expect(s.memberRecords().get('ada')?.picture ?? s.convenorRecord().picture).toBe('e🦊🏽');
    // and the name falls back when the holder has none
    const cy = s.invite(4, 'cy@example.org');
    s.arrive(4, cy);
    s.setIdentity(5, cy, { picture: 'e🐸' });
    expect(faceTakenBy(s, 'e🐸', 'ada')).toBe('Somebody');
  });
});
