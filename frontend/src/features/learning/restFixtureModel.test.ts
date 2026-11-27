import { expect, it } from 'vitest'
import { profileTrace, restContract, restResponse } from './restFixtureModel'

it('separates public, challenged, authenticated and unmatched routes',()=>{
  expect(restResponse('/api/status',false)).toMatchObject({status:200,challenge:false,controller:'Status controller'})
  expect(restResponse('/api/profile',false)).toMatchObject({status:401,challenge:true,controller:'Not invoked'})
  expect(restResponse('/api/profile',true)).toMatchObject({status:200,body:'{ "name": "fixture-reader" }'})
  expect(restResponse('/api/unlisted',true)).toMatchObject({status:403,challenge:false,controller:'Not invoked'})
})
it('traces distinct terminal stages and requires all release probes',()=>{
  expect(profileTrace.anonymous.at(-1)).toBe('Basic challenge returned')
  expect(profileTrace.accepted.at(-1)).toBe('Profile controller reads the principal')
  expect(restContract(['public','challenge','principal'])).toBe('Verify an unlisted route stays denied')
  expect(restContract(['public','challenge','principal','fallback'])).toBe('REST release contract verified')
})
