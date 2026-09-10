import fs from 'node:fs';
import path from 'node:path';

export function createStateStore(file){
 const load=()=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){if(error.code==='ENOENT')return {};throw error}};
 const save=state=>{fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temporary=`${file}.tmp`;fs.writeFileSync(temporary,JSON.stringify(state),{mode:0o600});fs.renameSync(temporary,file)};
 return {load,save};
}
