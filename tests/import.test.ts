// Synthetic importer round-trip; this is not an official source verification.
// @vitest-environment node
import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture} from '../src/data/fixture';
it('imports normalized files, refuses implicit overwrite, and preserves data after invalid input',()=>{
 const root=resolve('.');mkdirSync('.local',{recursive:true});const cwd=mkdtempSync(resolve('.local/import-test-'));
 try{const input=join(cwd,'synthetic.json');const n={...fixture,status:'imported',sources:[{url:'https://example.invalid/synthetic-test',retrievedAt:'2026-10-16',description:'Synthetic test only'}]};writeFileSync(input,JSON.stringify(n));
 const run=(args:string[]=[])=>spawnSync(process.execPath,[resolve(root,'node_modules/tsx/dist/cli.mjs'),resolve(root,'scripts/import-mrt-data.ts'),input,...args],{cwd,encoding:'utf8'});
 expect(run().status).toBe(0);const output=join(cwd,'src/data/official-network.json');const saved=readFileSync(output,'utf8');expect(JSON.parse(saved).stations).toHaveLength(26);expect(run().status).not.toBe(0);
 n.stations=[...n.stations,n.stations[0]];writeFileSync(input,JSON.stringify(n));expect(run(['--replace']).status).not.toBe(0);expect(readFileSync(output,'utf8')).toBe(saved);
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
