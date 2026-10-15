import { dashboardError } from '../i18n/dashboard-errors.js';
import type { StreamerRecord } from '../types.js';

/** Sanitize only known diagnostic slots, never creator text, moderation reasons, or settings. */
export function dashboardStream<T extends StreamerRecord>(record:T):T {
  if(!record.uploadState?.lastError)return record;
  const value=dashboardError(record.uploadState.lastError);
  return {...record,uploadState:{...record.uploadState,lastError:value.error,lastErrorI18n:value.i18n}};
}
export function dashboardModerationSnapshot(input:unknown):unknown {
  if(!input||typeof input!=='object'||!('recoveryIssues' in input)||!Array.isArray(input.recoveryIssues))return input;
  return {...input,recoveryIssues:input.recoveryIssues.map(issue=>{
    if(!issue||typeof issue!=='object'||typeof issue.detail!=='string')return issue;
    const value=dashboardError(issue.detail);return {...issue,detail:value.error,detailI18n:value.i18n};
  })};
}
export function dashboardCommunitySnapshot(input:unknown):unknown {
  if(!input||typeof input!=='object'||!('inviteTracking' in input)||!input.inviteTracking||typeof input.inviteTracking!=='object'||!('note' in input.inviteTracking)||typeof input.inviteTracking.note!=='string')return input;
  const value=dashboardError(input.inviteTracking.note);
  return {...input,inviteTracking:{...input.inviteTracking,note:value.error,noteI18n:value.i18n}};
}
