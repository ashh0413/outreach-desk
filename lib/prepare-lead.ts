import type { Lead } from './lead-types';

export function prepareLead(lead:Lead, postalAddress:string|undefined):Lead {
 if(!lead.batch)return lead;
 if(!postalAddress?.trim())return {...lead,status:'skipped: sender address missing',reason:'Configure the private OUTREACH_POSTAL_ADDRESS environment variable before sending this batch.'};
 return {...lead,body:lead.body ? `${lead.body}\n\nBusiness outreach / web development services\nPostal address: ${postalAddress.trim()}\nIf this is not relevant, reply “no thanks” and I will not contact you again.` : undefined};
}
