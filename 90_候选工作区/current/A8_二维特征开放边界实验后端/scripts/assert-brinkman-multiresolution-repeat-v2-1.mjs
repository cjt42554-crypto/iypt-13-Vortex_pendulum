import {
  assertIndependentRepeatByteIdentity,
} from "./brinkman-multiresolution-artifact-v2-1.mjs";

const closure = await assertIndependentRepeatByteIdentity({
  primaryPath: process.argv[2],
  repeatPath: process.argv[3],
});

console.log(JSON.stringify({
  primaryPath: closure.primaryPath,
  repeatPath: closure.repeatPath,
  primarySidecarPath: closure.primarySidecarPath,
  repeatSidecarPath: closure.repeatSidecarPath,
  gzipByteIdentical: closure.gzipByteIdentical,
  sidecarByteIdentical: closure.sidecarByteIdentical,
  independentFullRepeatMachineClosure: true,
  primaryIdentity: {
    storedSha256: closure.primaryIdentity.stored.sha256,
    storedBytes: closure.primaryIdentity.stored.bytes,
    canonicalSha256: closure.primaryIdentity.canonical.sha256,
    canonicalBytes: closure.primaryIdentity.canonical.bytes,
  },
  repeatIdentity: {
    storedSha256: closure.repeatIdentity.stored.sha256,
    storedBytes: closure.repeatIdentity.stored.bytes,
    canonicalSha256: closure.repeatIdentity.canonical.sha256,
    canonicalBytes: closure.repeatIdentity.canonical.bytes,
  },
}, null, 2));
