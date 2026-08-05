import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { connectDB } from './dao/connector.js';

const DB_PATH = process.env.DB_PATH || './data/system.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

connectDB();