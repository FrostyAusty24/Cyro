/** @param {{notBefore:number,notAfter:number}|null} certificate @param {number} now */
export function renewalDue(certificate, now) {
  return !certificate || now >= certificate.notBefore + (certificate.notAfter - certificate.notBefore) * 2 / 3;
}

export async function renewOnce(config, deps) {
  const release = await deps.lock();
  let pending = [];
  const cleanup = async record => {
    if (!record.id) throw new Error('DNS_CREATE_UNCERTAIN');
    await deps.dns.remove(record);
    pending = pending.filter(item => item !== record);
    await deps.store.savePending(pending);
  };
  try {
    pending = await deps.store.pending();
    for (const record of [...pending]) await cleanup(record);
    const current = await deps.store.current();
    if (!renewalDue(current, deps.now())) {
      deps.log('certificate_not_due', {hostname:config.hostname, notAfter:current.notAfter});
      return {status:'not_due', notAfter:current.notAfter};
    }
    if (!config.termsAgreed || (await deps.authority.terms()) !== config.approvedTermsUrl) throw new Error('TERMS_APPROVAL_REQUIRED');
    const certificate = await deps.authority.issue({
      create: async (auth, challenge, value) => {
        if (auth.identifier.value !== config.hostname || challenge.type !== 'dns-01') throw new Error('UNEXPECTED_CHALLENGE');
        const record = {name:`_acme-challenge.${config.hostname}`, value, id:null};
        pending.push(record);
        await deps.store.savePending(pending);
        try {record.id = await deps.dns.create(record);}
        catch(error) {
          if(error.confirmedRejected===true) {
            pending=pending.filter(item=>item!==record);
            await deps.store.savePending(pending);
            throw error;
          }
          throw new Error('DNS_CREATE_UNCERTAIN');
        }
        await deps.store.savePending(pending);
        await deps.waitDns(record.name, record.value);
      },
      remove: async (_auth, _challenge, value) => {
        const record = pending.find(item => item.value === value);
        if (record) await cleanup(record);
      },
    });
    const installed = await deps.store.publish(certificate);
    deps.log('certificate_renewed', {hostname:config.hostname, notAfter:installed.notAfter});
    return {status:'renewed', notAfter:installed.notAfter};
  } finally {
    let cleanupFailed = false;
    for (const record of [...pending]) {
      if (!record.id) continue;
      try { await cleanup(record); }
      catch { cleanupFailed = true; deps.log('dns_cleanup_pending', {hostname:config.hostname}); }
    }
    await release();
    if (cleanupFailed) throw new Error('DNS_CLEANUP_FAILED');
  }
}
