import { readFileSync, writeFileSync } from "node:fs";
// Writes the BASELINE.md corpus (parser benchmark samples + synthetic stress
// files) to <dir> as 00_s0_201b.rb .. 13_s6_mega_2.5mb.rb.
//   node benchmark/parser/gen_corpus.mjs <dir>
import * as synth from "./synth.mjs";
const C=new URL("./corpus/", import.meta.url).pathname, O=process.argv[2];
const f=n=>readFileSync(C+n,"utf8"); const s5=f("s5_639kb.rb");
const list={"s0_201b.rb":f("s0_201b.rb"),"synth_deep_nest.rb":synth.deepNest(100),"s1_324b.rb":f("s1_324b.rb"),
"synth_method_chain.rb":synth.methodChain(1000),"synth_binop_chain.rb":synth.binopChain(1000),"s2_pack.rb":f("s2_pack.rb"),
"s3_34kb.rb":f("s3_34kb.rb"),"s4_114kb.rb":f("s4_114kb.rb"),"synth_big_array.rb":synth.bigArray(50000),
"synth_many_locals.rb":synth.manyLocals(20000),"synth_many_methods.rb":synth.manyMethods(10000),"s5_639kb.rb":s5,
"synth_many_strings.rb":synth.manyStrings(20000),"s6_mega_2.5mb.rb":synth.mega(s5,4)};
let i=0; for (const [n,c] of Object.entries(list)) writeFileSync(`${O}/${String(i++).padStart(2,"0")}_${n}`,c);
