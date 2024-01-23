import * as fs from 'fs';
import { resolve, join } from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const { SPACES_PATH = '../../config/spaces' } = process.env;

const spacesFolder = resolve(join(process.cwd(), SPACES_PATH));

const spaces = fs
  .readdirSync(spacesFolder)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const mapContents = fs.readFileSync(join(spacesFolder, f), 'utf8');
    return JSON.parse(mapContents);
  });

export default (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json(spaces);
  return;
};
