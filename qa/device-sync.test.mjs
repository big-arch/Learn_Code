import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { resolve } from 'node:path'
const result=await build({configFile:false,logLevel:'silent',build:{lib:{entry:resolve('src/lib/deviceCode.ts'),formats:['es']},write:false,minify:false}})
const {createDeviceCode,normalizeDeviceCode}=await import('data:text/javascript;base64,'+Buffer.from((Array.isArray(result)?result[0]:result).output.find(o=>o.type==='chunk').code).toString('base64'))
test('random codes retain 160 bits and normalize pasted separators/case',()=>{
 const values=Array.from({length:100},()=>createDeviceCode())
 assert.equal(new Set(values).size,100)
 for(const value of values){assert.match(value,/^LC(?:-[0-9A-F]{8}){5}$/);assert.equal(normalizeDeviceCode('  '+value.toLowerCase().replaceAll('-',' ')+'\n'),value)}
})
test('rejects short, arbitrary, non-hex and truncated secrets',()=>{
 for(const value of ['', 'password', 'LC-123456', 'LC'+'A'.repeat(39), 'LC'+'Z'.repeat(40), 'LC'+'A'.repeat(41)])assert.equal(normalizeDeviceCode(value),null)
})
