# Redis Object-Native Data Model

Status: active runtime model.

The LIAN backend now uses Redis object keys as the primary runtime data model. Legacy bulk JSON keys were used only during migration and are no longer part of the normal read/write path.

## Primary verification commands

```bash
npm run test:object-native
npm run verify:redis
npm run verify:redis:auth
Runtime expectations

Required object-native environment flags:

LIAN_STORAGE_MODE=db
LIAN_REDIS_OBJECT_READS=true
LIAN_REDIS_OBJECT_PRIMARY=true
LIAN_AUTH_OBJECT_READS=true
LIAN_AUTH_OBJECT_NATIVE=true
Current primary data groups
Post metadata: postmeta:tids, postmeta:tid:*
Feed rules: feed:rules:keys, feed:rule:*
Channel reads: channel:read:users, channel:read:user:*
User cache: usercache:users, usercache:user:*, usercache:actors, usercache:actor:*
Map: map:location:index, map:location:*, map:layer:*, map:layer:bundle
Clubs: club:index, club:item:*
AI drafts/records: ai:draft:index, ai:draft:item:*, ai:record:index, ai:record:item:*
Auth: auth:user:ids, auth:user:*, auth:email:*, auth:username:*, auth:sessions, auth:session:*, auth:invites, auth:invite:*, auth:verifications, auth:verification:*
Legacy scripts

Old migration and bulk-verification helpers are kept under scripts/legacy/ and exposed only through legacy:* npm scripts. They are not part of normal development verification.
