import * as fs from 'fs';
import { resolve, join } from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const { SPACES_PATH = '../../config/spaces' } = process.env;

const spacesFolder = resolve(join(process.cwd(), SPACES_PATH));

export default (req: NextApiRequest, res: NextApiResponse) => {
  const {
    query: { id },
    method,
  } = req;

  const mapFilePath = `${spacesFolder}/${id}.json`;

  if (fs.existsSync(mapFilePath)) {
    const mapJson = fs.readFileSync(mapFilePath, 'utf8');
    res.status(200).json(JSON.parse(mapJson));
    return;
  }

  res.status(404);
};
