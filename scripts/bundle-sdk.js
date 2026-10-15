const {build} = require('esbuild');
Promise.all([
 build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'vendor/supabase.js'}),
 build({entryPoints:['native-files.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'vendor/native-files.js'})
]).catch(()=>process.exit(1));
