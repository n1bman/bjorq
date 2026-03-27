import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-ignore - server JS module without type declarations
import { readJSON } from '../../server/storage/readWrite.js';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe('readWrite.readJSON', () => {
  it('parses json files that start with a utf-8 bom', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'bjorq-readjson-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'config.json');

    await writeFile(filePath, '\ufeff{"hello":"world"}', 'utf8');

    await expect(readJSON(filePath)).resolves.toEqual({ hello: 'world' });
  });
});
