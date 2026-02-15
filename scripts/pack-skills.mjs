import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/skills');
const packDir = path.join(__dirname, '../packs/skills');

async function packSkills() {
  console.log('Packing skills compendium...\n');

  // Ensure pack directory exists
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  // Remove existing database to start fresh
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });
  }

  // Open LevelDB database
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    // Create folder structure
    const now = Date.now();
    const folders = [
      {
        _id: 'combatskills',
        name: 'Combat Skills',
        sorting: 'a',
        folder: null,
        type: 'Item',
        sort: 100000,
        color: '#ff4444',
        description: '',
        _stats: {
          systemId: 'dungeon-crawler-world',
          systemVersion: '0.14.5',
          coreVersion: '13',
          createdTime: now,
          modifiedTime: now,
          lastModifiedBy: 'SYSTEM'
        },
        flags: {}
      },
      {
        _id: 'magicskills',
        name: 'Magic Skills',
        sorting: 'a',
        folder: null,
        type: 'Item',
        sort: 200000,
        color: '#4444ff',
        description: '',
        _stats: {
          systemId: 'dungeon-crawler-world',
          systemVersion: '0.14.5',
          coreVersion: '13',
          createdTime: now,
          modifiedTime: now,
          lastModifiedBy: 'SYSTEM'
        },
        flags: {}
      },
      {
        _id: 'utilityskills',
        name: 'Utility Skills',
        sorting: 'a',
        folder: null,
        type: 'Item',
        sort: 300000,
        color: '#44ff44',
        description: '',
        _stats: {
          systemId: 'dungeon-crawler-world',
          systemVersion: '0.14.5',
          coreVersion: '13',
          createdTime: now,
          modifiedTime: now,
          lastModifiedBy: 'SYSTEM'
        },
        flags: {}
      },
      {
        _id: 'generalskills',
        name: 'General Skills',
        sorting: 'a',
        folder: null,
        type: 'Item',
        sort: 400000,
        color: '#ffaa00',
        description: '',
        _stats: {
          systemId: 'dungeon-crawler-world',
          systemVersion: '0.14.5',
          coreVersion: '13',
          createdTime: now,
          modifiedTime: now,
          lastModifiedBy: 'SYSTEM'
        },
        flags: {}
      }
    ];

    // Pack folders
    console.log('Creating folder structure...');
    for (const folder of folders) {
      const key = `!folders!${folder._id}`;
      await db.put(key, folder);
      console.log(`✓ Created folder: ${folder.name}`);
    }
    console.log('');

    // Read all JSON files from source directory
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));

    console.log(`Found ${files.length} source files`);

    let count = 0;
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (!data._id) {
        console.error(`⚠ Skipping ${file}: missing _id field`);
        continue;
      }

      // Use !items! prefix as Foundry expects
      const key = `!items!${data._id}`;
      await db.put(key, data);

      console.log(`✓ Packed: ${data.name} (${data._id})`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} skills`);
  } catch (error) {
    console.error('Error packing skills:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packSkills().catch(console.error);
